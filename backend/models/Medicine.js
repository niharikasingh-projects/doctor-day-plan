const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required.'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Medicine category is required.'],
      enum: {
        values: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Other'],
        message: '{VALUE} is not a supported medicine category.',
      },
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    strength: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      enum: ['mg', 'ml', 'g', 'mcg', 'IU'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema);
