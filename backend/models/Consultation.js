const mongoose = require('mongoose');

// Embedded prescription line-item: denormalizes the medicine name/category at
// prescription time so historical records remain accurate even if the
// referenced Medicine catalog entry changes later, while still keeping the
// ObjectId reference for lookups and reporting.
const prescribedMedicineSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'medicineId is required for a prescribed medicine.'],
    },
    name: {
      type: String,
      required: [true, 'Prescribed medicine name is required.'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g. "500mg").'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required (e.g. "1-0-1").'],
      trim: true,
    },
    durationDays: {
      type: Number,
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
    symptoms: {
      type: String,
      required: [true, 'symptoms text is required.'],
      trim: true,
    },
    diagnosis: {
      type: String,
      required: [true, 'diagnosis is required.'],
      trim: true,
    },
    medicines: {
      type: [prescribedMedicineSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

consultationSchema.index({ patientId: 1, createdAt: -1 });
consultationSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model('Consultation', consultationSchema);
