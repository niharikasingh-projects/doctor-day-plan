const Appointment = require('../models/Appointment');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const { getIO } = require('../sockets/ioInstance');
const { addPatientToQueue, removeAppointmentsFromQueues } = require('../sockets/queueHandler');
const {
  notifyPatientBooked,
  notifyPatientStatusChanged,
  notifyDoctorPatientCancelled,
  notifyPatientsEmergency,
} = require('../utils/notificationService');
const {
  isValidObjectId,
  isValidTime,
  isPresentOrFutureDate,
  getPagination,
  buildPaginationMeta,
} = require('../utils/validators');

// POST /api/appointments (Patient only) — books a new appointment slot.
const createAppointment = async (req, res) => {
  try {
    const { clinicId, doctorId, appointmentDate, slotTime } = req.body;

    if (!clinicId || !doctorId || !appointmentDate || !slotTime) {
      return res.status(400).json({ error: 'clinicId, doctorId, appointmentDate, and slotTime are required.' });
    }
    if (!isValidObjectId(clinicId) || !isValidObjectId(doctorId)) {
      return res.status(400).json({ error: 'clinicId and doctorId must be valid ids.' });
    }
    if (!isValidTime(slotTime)) {
      return res.status(400).json({ error: 'slotTime must be in HH:mm 24-hour format.' });
    }
    if (!isPresentOrFutureDate(appointmentDate)) {
      return res.status(400).json({ error: 'appointmentDate must be a valid date today or in the future.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found.' });
    }
    if (clinic.status !== 'active') {
      return res.status(400).json({ error: 'This clinic is currently closed and is not accepting bookings.' });
    }
    if (String(clinic.doctorId) !== String(doctorId)) {
      return res.status(400).json({ error: 'doctorId does not match the clinic that was selected.' });
    }

    const existingAppointment = await Appointment.findOne({ clinicId, appointmentDate, slotTime });
    if (existingAppointment) {
      return res.status(400).json({ error: 'This appointment slot is already booked.' });
    }

    const appointment = new Appointment({
      clinicId,
      doctorId,
      patientId: req.user.userId,
      appointmentDate,
      slotTime,
      status: 'pending',
    });

    await appointment.save();

    const io = getIO();
    if (io) {
      io.to(`user:${appointment.doctorId}`).emit('appointmentUpdated', {
        appointmentId: String(appointment._id),
        status: appointment.status,
        message: `Appointment status updated to ${appointment.status}.`,
      });
    }

    // Email + SMS to the patient (demo-mode safe — never throws).
    const [patient, doctor] = await Promise.all([
      User.findById(appointment.patientId).select('email phone patientProfile'),
      User.findById(appointment.doctorId).select('email phone doctorProfile'),
    ]);
    await notifyPatientBooked({ patient, appointment, clinic, doctor });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error('createAppointment error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/appointments/emergency (Doctor only) — cancels today's active appointments.
const triggerDoctorEmergency = async (req, res) => {
  try {
    const reason = String(req.body.reason || 'Doctor emergency: the doctor is unavailable today. Please reschedule your appointment.').trim();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: req.user.userId,
      appointmentDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $in: ['pending', 'confirmed'] },
    }).select('_id patientId clinicId appointmentDate slotTime');

    if (appointments.length === 0) {
      return res.status(200).json({ message: 'No active appointments required cancellation.', cancelledCount: 0 });
    }

    const appointmentIds = appointments.map((appointment) => appointment._id);
    await Appointment.updateMany(
      { _id: { $in: appointmentIds } },
      { $set: { status: 'cancelled', cancelReason: reason, checkedInAt: null } }
    );

    const io = getIO();
    if (io) {
      removeAppointmentsFromQueues(io, appointments);
      const patientIds = [...new Set(appointments.map((appointment) => String(appointment.patientId)))];
      patientIds.forEach((patientId) => {
        io.to(`user:${patientId}`).emit('doctorEmergency', {
          message: reason,
          doctorId: String(req.user.userId),
          appointmentIds: appointments
            .filter((appointment) => String(appointment.patientId) === patientId)
            .map((appointment) => String(appointment._id)),
        });
      });
    }

    // Email + SMS every patient lined up today (demo-mode safe — never throws).
    const affectedPatientIds = [...new Set(appointments.map((appointment) => String(appointment.patientId)))];
    const affectedPatients = await User.find({ _id: { $in: affectedPatientIds } }).select(
      'email phone patientProfile'
    );
    await notifyPatientsEmergency({ patients: affectedPatients, reason });

    return res.status(200).json({
      message: 'Patients have been notified and active appointments were cancelled.',
      cancelledCount: appointments.length,
      reason,
    });
  } catch (error) {
    console.error('triggerDoctorEmergency error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/appointments/:id/status (Doctor/Patient) — transitions an appointment's status.
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (req.user.role === 'doctor') {
      if (!['confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Doctors may only set status to confirmed or rejected.' });
      }
      if (String(appointment.doctorId) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'You do not have permission to modify this appointment.' });
      }
      appointment.status = status;
    } else if (req.user.role === 'patient') {
      if (status !== 'cancelled') {
        return res.status(400).json({ error: 'Patients may only cancel appointments.' });
      }
      if (appointment.status !== 'pending') {
        return res.status(400).json({ error: 'Patients may cancel appointments only before confirmation.' });
      }
      if (!cancelReason) {
        return res.status(400).json({ error: 'cancelReason is required when cancelling an appointment.' });
      }
      if (String(appointment.patientId) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'You do not have permission to modify this appointment.' });
      }
      appointment.status = status;
      appointment.cancelReason = cancelReason;
    } else {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    await appointment.save();

    const io = getIO();
    if (io) {
      const recipientId = req.user.role === 'doctor' ? appointment.patientId : appointment.doctorId;
      io.to(`user:${recipientId}`).emit('appointmentUpdated', {
        appointmentId: String(appointment._id),
        status: appointment.status,
        message: req.user.role === 'doctor'
          ? `Your appointment was ${appointment.status}.`
          : 'The patient cancelled an appointment.',
      });
    }

    // Email + SMS notifications (demo-mode safe — never throws).
    const [clinic, patient, doctor] = await Promise.all([
      Clinic.findById(appointment.clinicId).select('name address'),
      User.findById(appointment.patientId).select('email phone patientProfile'),
      User.findById(appointment.doctorId).select('email phone doctorProfile'),
    ]);
    if (req.user.role === 'doctor') {
      await notifyPatientStatusChanged({ patient, appointment, clinic, doctor, status });
    } else {
      await notifyPatientStatusChanged({ patient, appointment, clinic, doctor, status, reason: cancelReason });
      await notifyDoctorPatientCancelled({ doctor, appointment, clinic, patient, reason: cancelReason });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error('updateStatus error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/appointments/:id/reschedule (Doctor only) — moves an appointment to a free slot.
const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, slotTime } = req.body;
    if (!appointmentDate || !slotTime) {
      return res.status(400).json({ error: 'appointmentDate and slotTime are required.' });
    }
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Appointment id is invalid.' });
    }
    if (!isValidTime(slotTime)) {
      return res.status(400).json({ error: 'slotTime must be in HH:mm 24-hour format.' });
    }
    if (!isPresentOrFutureDate(appointmentDate)) {
      return res.status(400).json({ error: 'appointmentDate must be a valid date today or in the future.' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    if (String(appointment.doctorId) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'You do not have permission to reschedule this appointment.' });
    }
    if (['cancelled', 'rejected', 'completed'].includes(appointment.status)) {
      return res.status(400).json({ error: 'This appointment cannot be rescheduled.' });
    }

    const conflict = await Appointment.findOne({
      _id: { $ne: id },
      clinicId: appointment.clinicId,
      appointmentDate,
      slotTime,
      status: { $nin: ['cancelled', 'rejected'] },
    });
    if (conflict) return res.status(400).json({ error: 'This appointment slot is already booked.' });

    appointment.appointmentDate = appointmentDate;
    appointment.slotTime = slotTime;
    appointment.status = 'pending';
    appointment.checkedInAt = null;
    await appointment.save();

    const io = getIO();
    if (io) {
      io.to(`user:${appointment.patientId}`).emit('appointmentUpdated', {
        appointmentId: String(appointment._id),
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        slotTime: appointment.slotTime,
        message: 'Your appointment was rescheduled and is awaiting confirmation.',
      });
    }
    return res.status(200).json(appointment);
  } catch (error) {
    console.error('rescheduleAppointment error:', error);
    if (error.code === 11000) return res.status(400).json({ error: 'This appointment slot is already booked.' });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/appointments/:id/checkin (Patient only) — marks the patient as checked in.
const patientCheckIn = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    if (String(appointment.patientId) !== String(req.user.userId)) {
      return res.status(403).json({ error: 'You do not have permission to check in this appointment.' });
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Only pending or confirmed appointments can be checked in.' });
    }

    if (appointment.checkedInAt) {
      return res.status(200).json(appointment);
    }

    appointment.status = 'confirmed';
    appointment.checkedInAt = Date.now();
    await appointment.save();

    const io = getIO();
    if (io) {
      const [patient, doctor] = await Promise.all([
        User.findById(appointment.patientId),
        User.findById(appointment.doctorId),
      ]);

      addPatientToQueue(
        io,
        String(appointment.clinicId),
        {
          appointmentId: String(appointment._id),
          patientId: String(appointment.patientId),
          patientName: patient?.patientProfile?.name || patient?.email || 'Patient',
          checkedInAt: appointment.checkedInAt,
        },
        doctor?.doctorProfile?.avgConsultationMins || 15
      );
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error('patientCheckIn error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/appointments/today (Doctor only) — lists today's appointments for the authenticated doctor.
const getTodayAppointments = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: req.user.userId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('patientId', 'email phone patientProfile')
      .populate('clinicId', 'name address')
      .sort({ slotTime: 1 });

    return res.status(200).json(appointments);
  } catch (error) {
    console.error('getTodayAppointments error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/appointments/upcoming?page=1&limit=10&all=true (Doctor only) — lists the
// authenticated doctor's current & future appointments. Paginated by default;
// pass all=true to fetch the full (server-capped) list for Excel export.
const getUpcomingAppointments = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const filter = {
      doctorId: req.user.userId,
      appointmentDate: { $gte: startOfToday },
    };
    const { page, limit, skip } = getPagination(req.query, 10);

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate('patientId', 'email phone patientProfile')
        .populate('clinicId', 'name address')
        .sort({ appointmentDate: 1, slotTime: 1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ data: appointments, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('getUpcomingAppointments error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/appointments/my?page=1&limit=10 (Patient only) — lists the authenticated
// patient's own bookings, paginated. Not part of the original spec's exposed
// endpoints, but required for the patient booking-history UI (AppointmentList.jsx).
const getMyAppointments = async (req, res) => {
  try {
    const filter = { patientId: req.user.userId };
    const { page, limit, skip } = getPagination(req.query, 10);

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter)
        .populate('doctorId', 'email doctorProfile')
        .populate('clinicId', 'name address')
        .sort({ appointmentDate: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ data: appointments, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('getMyAppointments error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createAppointment,
  triggerDoctorEmergency,
  updateStatus,
  rescheduleAppointment,
  patientCheckIn,
  getTodayAppointments,
  getUpcomingAppointments,
  getMyAppointments,
};
