const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'clinicId is required.'],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'doctorId is required.'],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'patientId is required.'],
    },
    appointmentDate: {
      type: Date,
      required: [true, 'appointmentDate is required.'],
    },
    slotTime: {
      type: String,
      required: [true, 'slotTime is required (HH:mm format), e.g. "10:30".'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'slotTime must be in HH:mm 24-hour format.'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
        message: '{VALUE} is not a supported appointment status.',
      },
      default: 'pending',
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevents double-booking the same clinic slot on the same day at the database level.
appointmentSchema.index({ clinicId: 1, appointmentDate: 1, slotTime: 1 }, { unique: true });
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
