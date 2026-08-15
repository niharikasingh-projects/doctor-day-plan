const mongoose = require('mongoose');

// Embedded structure describing a doctor's recurring weekly clinical hours per clinic.
const scheduleRuleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      required: [true, 'dayOfWeek is required for a schedule rule.'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    startTime: {
      type: String,
      required: [true, 'startTime is required (24hr HH:mm format), e.g. "09:00".'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'startTime must be in HH:mm 24-hour format.'],
    },
    endTime: {
      type: String,
      required: [true, 'endTime is required (24hr HH:mm format), e.g. "17:00".'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'endTime must be in HH:mm 24-hour format.'],
    },
  },
  { _id: false }
);

const clinicSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'doctorId is required to associate a clinic with its owning doctor.'],
    },
    name: {
      type: String,
      required: [true, 'Clinic name is required.'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Clinic address is required.'],
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid contact phone number.'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a supported clinic status.',
      },
      default: 'active',
    },
    scheduleRules: {
      type: [scheduleRuleSchema],
      default: [],
    },
  },
  { timestamps: true }
);

clinicSchema.index({ doctorId: 1 });

module.exports = mongoose.model('Clinic', clinicSchema);
