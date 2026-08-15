// In-memory per-clinic live queue state: clinicId -> { currentPatient, waitingQueue }
// Not persisted to MongoDB — this is ephemeral real-time state layered on top of the
// Appointment collection (patients are added here when they REST check-in).
const queues = new Map();
const Appointment = require('../models/Appointment');

const getOrCreateQueue = (clinicId) => {
  if (!queues.has(clinicId)) {
    queues.set(clinicId, { currentPatient: null, waitingQueue: [] });
  }
  return queues.get(clinicId);
};

const estimateWaitTime = (waitingQueue, avgConsultationMins) => waitingQueue.length * avgConsultationMins;

const buildPayload = (clinicId, avgConsultationMins = 15) => {
  const queue = getOrCreateQueue(clinicId);
  return {
    currentPatient: queue.currentPatient,
    waitingQueueArray: queue.waitingQueue,
    estimatedWaitTime: estimateWaitTime(queue.waitingQueue, avgConsultationMins),
  };
};

// Called from appointmentController.patientCheckIn once a patient checks in via REST.
const addPatientToQueue = (io, clinicId, patientEntry, avgConsultationMins = 15) => {
  const queue = getOrCreateQueue(clinicId);
  const alreadyQueued = queue.waitingQueue.some((entry) => entry.appointmentId === patientEntry.appointmentId)
    || queue.currentPatient?.appointmentId === patientEntry.appointmentId;
  if (alreadyQueued) return;
  queue.waitingQueue.push(patientEntry);
  io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
};

const hydrateQueue = async (io, clinicId, avgConsultationMins = 15) => {
  const queue = getOrCreateQueue(clinicId);
  const appointments = await Appointment.find({
    clinicId,
    checkedInAt: { $ne: null },
    status: 'confirmed',
  }).populate('patientId', 'email patientProfile');

  appointments.sort((left, right) => new Date(left.checkedInAt) - new Date(right.checkedInAt));
  appointments.forEach((appointment) => {
    addPatientToQueue(io, clinicId, {
      appointmentId: String(appointment._id),
      patientId: String(appointment.patientId?._id || appointment.patientId),
      patientName: appointment.patientId?.patientProfile?.name || appointment.patientId?.email || 'Patient',
      checkedInAt: appointment.checkedInAt,
    }, avgConsultationMins);
  });
  io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
};

const removeAppointmentsFromQueues = (io, appointments) => {
  const byClinic = new Map();
  appointments.forEach((appointment) => {
    const clinicId = String(appointment.clinicId);
    if (!byClinic.has(clinicId)) byClinic.set(clinicId, []);
    byClinic.get(clinicId).push(String(appointment._id));
  });

  byClinic.forEach((appointmentIds, clinicId) => {
    const queue = getOrCreateQueue(clinicId);
    const appointmentSet = new Set(appointmentIds);
    queue.waitingQueue = queue.waitingQueue.filter((entry) => !appointmentSet.has(entry.appointmentId));
    if (queue.currentPatient && appointmentSet.has(queue.currentPatient.appointmentId)) {
      queue.currentPatient = null;
    }
    io.to(clinicId).emit('queueUpdated', buildPayload(clinicId));
  });
};

// Sets up all Socket.io event listeners for the real-time live queue feature.
const initQueueHandler = (io) => {
  io.on('connection', (socket) => {
    socket.on('joinUserRoom', ({ userId } = {}) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('joinQueueRoom', async ({ clinicId, avgConsultationMins } = {}) => {
      if (!clinicId) return;
      socket.join(clinicId);
      await hydrateQueue(io, clinicId, avgConsultationMins);
      socket.emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
    });

    socket.on('callNextPatient', ({ clinicId, avgConsultationMins } = {}) => {
      if (!clinicId) return;
      const queue = getOrCreateQueue(clinicId);
      queue.currentPatient = queue.waitingQueue.shift() || null;
      io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
    });

    socket.on('skipPatient', ({ clinicId, appointmentId, avgConsultationMins } = {}) => {
      if (!clinicId || !appointmentId) return;
      const queue = getOrCreateQueue(clinicId);
      const index = queue.waitingQueue.findIndex((entry) => entry.appointmentId === appointmentId);
      if (index !== -1) {
        const [skipped] = queue.waitingQueue.splice(index, 1);
        queue.waitingQueue.push(skipped);
      }
      io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
    });

    socket.on('consultationFinished', ({ clinicId, avgConsultationMins } = {}) => {
      if (!clinicId) return;
      const queue = getOrCreateQueue(clinicId);
      queue.currentPatient = null;
      io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
    });
  });
};

module.exports = { initQueueHandler, addPatientToQueue, getOrCreateQueue, hydrateQueue, removeAppointmentsFromQueues };
