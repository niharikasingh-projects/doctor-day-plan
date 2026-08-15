const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const mongoose = require('mongoose');
const generatePrescriptionPDF = require('../utils/prescriptionGenerator');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/consultations (Doctor only) — records a diagnosis and completes the appointment.
const createConsultation = async (req, res) => {
  let session;
  try {
    const { appointmentId, diagnosis, clinicalNotes, medicines } = req.body;

    if (!appointmentId || !diagnosis) {
      return res
        .status(400)
        .json({ error: 'appointmentId and diagnosis are required.' });
    }

    session = await mongoose.startSession();
    let savedConsultation;

    await session.withTransaction(async () => {
      const appointment = await Appointment.findById(appointmentId).session(session);
      if (!appointment) {
        const notFoundError = new Error('Appointment not found.');
        notFoundError.statusCode = 404;
        throw notFoundError;
      }

      if (String(appointment.doctorId) !== String(req.user.userId)) {
        const forbiddenError = new Error('You do not have permission to create a consultation for this appointment.');
        forbiddenError.statusCode = 403;
        throw forbiddenError;
      }

      const existingConsultation = await Consultation.findOne({ appointmentId }).session(session);
      if (existingConsultation) {
        const duplicateError = new Error('A consultation already exists for this appointment.');
        duplicateError.statusCode = 400;
        throw duplicateError;
      }

      const consultation = new Consultation({
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        clinicId: appointment.clinicId,
        diagnosis,
        clinicalNotes,
        medicines,
      });

      savedConsultation = await consultation.save({ session });
      appointment.status = 'completed';
      await appointment.save({ session });
    });

    return res.status(201).json(savedConsultation);
  } catch (error) {
    console.error('createConsultation error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// GET /api/consultations/search?query=... (Doctor only) — finds patients already associated with this doctor.
const searchPatients = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (query.length < 2) {
      return res.status(400).json({ error: 'query must contain at least 2 characters.' });
    }

    const patientIds = await Appointment.distinct('patientId', { doctorId: req.user.userId });
    const searchPattern = new RegExp(escapeRegex(query), 'i');
    const patients = await User.find({
      _id: { $in: patientIds },
      role: 'patient',
      $or: [{ email: searchPattern }, { phone: searchPattern }, { 'patientProfile.name': searchPattern }],
    })
      .select('email phone patientProfile')
      .sort({ 'patientProfile.name': 1 })
      .limit(25);

    return res.status(200).json(patients);
  } catch (error) {
    console.error('searchPatients error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/consultations/patient/:patientId (Doctor/Patient) — returns a patient's consultation history.
const getHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === 'patient' && String(req.user.userId) !== String(patientId)) {
      return res.status(403).json({ error: 'You do not have permission to view this patient history.' });
    }

    if (req.user.role === 'doctor') {
      const hasTreatedPatient = await Appointment.exists({ doctorId: req.user.userId, patientId });
      if (!hasTreatedPatient) {
        return res.status(403).json({ error: 'You do not have permission to view this patient history.' });
      }
    }

    const consultations = await Consultation.find({ patientId })
      .populate('clinicId', 'name address')
      .populate('doctorId', 'email doctorProfile')
      .sort({ createdAt: -1 });

    return res.status(200).json(consultations);
  } catch (error) {
    console.error('getHistory error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/consultations/:id/download (Doctor/Patient) — streams the prescription PDF.
const downloadPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id)
      .populate('clinicId', 'name address contactPhone')
      .populate('doctorId', 'email doctorProfile')
      .populate('patientId', 'email patientProfile');

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found.' });
    }

    const isOwner =
      String(consultation.doctorId?._id) === String(req.user.userId) ||
      String(consultation.patientId?._id) === String(req.user.userId);

    if (!isOwner) {
      return res.status(403).json({ error: 'You do not have permission to download this prescription.' });
    }

    generatePrescriptionPDF(res, consultation);
  } catch (error) {
    console.error('downloadPrescription error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { createConsultation, searchPatients, getHistory, downloadPrescription };
