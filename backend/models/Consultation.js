const mongoose = require('mongoose');

// Embedded prescription line-item — self-contained (no catalog reference) per
// the Module 5 data dictionary; dosage follows the common "1-0-1" shorthand.
const prescribedMedicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Prescribed medicine name is required.'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g. "1-0-1").'],
      trim: true,
    },
    durationDays: {
      type: Number,
      required: [true, 'durationDays is required.'],
      min: [1, 'durationDays must be at least 1.'],
    },
    instructions: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'appointmentId is required.'],
      unique: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'patientId is required.'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'doctorId is required.'],
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'clinicId is required.'],
    },
    diagnosis: {
      type: String,
      required: [true, 'diagnosis is required.'],
      trim: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
    },
    medicines: {
      type: [prescribedMedicineSchema],
      default: [],
    },
  },
  { timestamps: true }
);

consultationSchema.index({ patientId: 1, createdAt: -1 });
consultationSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model('Consultation', consultationSchema);
