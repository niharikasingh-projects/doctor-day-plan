// In-memory per-clinic live queue state: clinicId -> { currentPatient, waitingQueue }
// Not persisted to MongoDB — this is ephemeral real-time state layered on top of the
// Appointment collection (patients are added here when they REST check-in).
const queues = new Map();

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
  queue.waitingQueue.push(patientEntry);
  io.to(clinicId).emit('queueUpdated', buildPayload(clinicId, avgConsultationMins));
};

// Sets up all Socket.io event listeners for the real-time live queue feature.
const initQueueHandler = (io) => {
  io.on('connection', (socket) => {
    socket.on('joinQueueRoom', ({ clinicId, avgConsultationMins } = {}) => {
      if (!clinicId) return;
      socket.join(clinicId);
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

module.exports = { initQueueHandler, addPatientToQueue, getOrCreateQueue };
