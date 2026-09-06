const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const mongoose = require('mongoose');
const generatePrescriptionPDF = require('../utils/prescriptionGenerator');
const { isValidObjectId, getPagination, buildPaginationMeta } = require('../utils/validators');

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
    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ error: 'appointmentId is invalid.' });
    }
    if (String(diagnosis).trim().length < 2) {
      return res.status(400).json({ error: 'diagnosis must contain at least 2 characters.' });
    }
    if (medicines !== undefined) {
      if (!Array.isArray(medicines)) {
        return res.status(400).json({ error: 'medicines must be an array.' });
      }
      const invalidMedicine = medicines.find(
        (medicine) =>
          !medicine ||
          !medicine.name ||
          !medicine.dosage ||
          !medicine.durationDays ||
          Number(medicine.durationDays) < 1
      );
      if (invalidMedicine) {
        return res
          .status(400)
          .json({ error: 'Each medicine requires a name, dosage, and durationDays of at least 1.' });
      }
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

// GET /api/consultations/search?query=...&page=1&limit=10 (Doctor only) — finds patients
// already associated with this doctor. Matches patient name/email/phone AND the
// diagnosis/illness text of this doctor's past consultations; diagnosis matches are
// returned with a matchedDiagnoses list so the UI can show why the patient matched.
const searchPatients = async (req, res) => {
  try {
    const query = String(req.query.query || '').trim();
    if (query.length < 2) {
      return res.status(400).json({ error: 'query must contain at least 2 characters.' });
    }

    const searchPattern = new RegExp(escapeRegex(query), 'i');
    const patientIds = await Appointment.distinct('patientId', { doctorId: req.user.userId });

    // Patients whose past consultations with this doctor match the diagnosis text.
    const diagnosisMatches = await Consultation.aggregate([
      {
        $match: {
          doctorId: new mongoose.Types.ObjectId(String(req.user.userId)),
          diagnosis: searchPattern,
        },
      },
      { $group: { _id: '$patientId', matchedDiagnoses: { $addToSet: '$diagnosis' } } },
    ]);
    const diagnosisMatchMap = new Map(
      diagnosisMatches.map((entry) => [String(entry._id), entry.matchedDiagnoses])
    );

    const matchedIds = [...new Set([...patientIds.map(String), ...diagnosisMatchMap.keys()])];
    if (matchedIds.length === 0) {
      return res.status(200).json({ data: [], pagination: buildPaginationMeta(0, 1, 10) });
    }

    const filter = {
      _id: { $in: matchedIds },
      role: 'patient',
      $or: [
        { email: searchPattern },
        { phone: searchPattern },
        { 'patientProfile.name': searchPattern },
        { _id: { $in: [...diagnosisMatchMap.keys()] } },
      ],
    };

    const { page, limit, skip } = getPagination(req.query, 10);
    const [total, patients] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('email phone patientProfile')
        .sort({ 'patientProfile.name': 1 })
        .skip(skip)
        .limit(limit),
    ]);

    const data = patients.map((patient) => ({
      ...patient.toObject(),
      matchedDiagnoses: diagnosisMatchMap.get(String(patient._id)) || [],
    }));

    return res.status(200).json({ data, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('searchPatients error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/consultations/patient/:patientId?page=1&limit=10&all=true (Doctor/Patient) —
// returns a patient's consultation history. Paginated by default; pass all=true to
// fetch the full (server-capped) history for Excel export.
const getHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ error: 'patientId is invalid.' });
    }

    if (req.user.role === 'patient' && String(req.user.userId) !== String(patientId)) {
      return res.status(403).json({ error: 'You do not have permission to view this patient history.' });
    }

    if (req.user.role === 'doctor') {
      const hasTreatedPatient = await Appointment.exists({ doctorId: req.user.userId, patientId });
      if (!hasTreatedPatient) {
        return res.status(403).json({ error: 'You do not have permission to view this patient history.' });
      }
    }

    const { page, limit, skip } = getPagination(req.query, 10);
    const filter = { patientId };
    const [total, consultations] = await Promise.all([
      Consultation.countDocuments(filter),
      Consultation.find(filter)
        .populate('clinicId', 'name address')
        .populate('doctorId', 'email doctorProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return res.status(200).json({ data: consultations, pagination: buildPaginationMeta(total, page, limit) });
  } catch (error) {
    console.error('getHistory error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/consultations/:id/download (Doctor/Patient) — streams the prescription PDF.
const downloadPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Consultation id is invalid.' });
    }

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
