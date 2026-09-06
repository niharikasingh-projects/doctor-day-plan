const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Embedded profile used only when role === 'doctor'.
const doctorProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required.'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Medical license number is required for doctors.'],
      trim: true,
      match: [/^[A-Za-z0-9\-/]{5,20}$/, 'Please provide a valid medical license number (5-20 letters, digits, "-" or "/").'],
    },
    specialization: {
      type: String,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: [0, 'experienceYears cannot be negative.'],
    },
    bio: {
      type: String,
      trim: true,
    },
    defaultSlotDurationMins: {
      type: Number,
      min: [5, 'defaultSlotDurationMins must be at least 5 minutes.'],
      default: 15,
    },
    avgConsultationMins: {
      type: Number,
      min: [5, 'avgConsultationMins must be at least 5 minutes.'],
      default: 15,
    },
    unavailableDates: {
      type: [
        {
          date: { type: Date, required: [true, 'date is required for an unavailable date entry.'] },
          reason: { type: String, trim: true },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

// Embedded profile used only when role === 'patient'.
const patientProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Patient name is required.'],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required.'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required.'],
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: '{VALUE} is not a supported gender.',
      },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number.'],
      required: [
        function () {
          return this.role === 'patient';
        },
        'Phone number is required for patients.',
      ],
    },
    role: {
      type: String,
      required: [true, 'Role is required.'],
      enum: {
        values: ['doctor', 'patient'],
        message: '{VALUE} is not a supported role.',
      },
    },
    doctorProfile: {
      type: doctorProfileSchema,
      required: [
        function () {
          return this.role === 'doctor';
        },
        'doctorProfile is required when role is "doctor".',
      ],
      default: undefined,
    },
    patientProfile: {
      type: patientProfileSchema,
      required: [
        function () {
          return this.role === 'patient';
        },
        'patientProfile is required when role is "patient".',
      ],
      default: undefined,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Hashed (sha256) password-reset token + expiry for the forgot-password flow.
    // Never returned by queries (select: false); the raw token only ever travels
    // over the out-of-band reset channel.
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// License numbers must be unique across doctors; sparse so patient documents
// (which have no doctorProfile at all) are skipped by the index.
userSchema.index({ 'doctorProfile.licenseNumber': 1 }, { unique: true, sparse: true });

// Virtual "password" setter accepts the raw plaintext password from
// controllers; the pre-save hook below hashes it into passwordHash.
userSchema.virtual('password').set(function (plainPassword) {
  this.passwordHash = plainPassword;
  this._passwordModified = true;
});

// Hash passwordHash whenever a new plaintext password was assigned via the virtual.
// Note: this mongoose version's async pre-hooks are promise-based (no "next" callback);
// throwing/returning is how success/failure is signaled.
userSchema.pre('save', async function () {
  if (!this._passwordModified && !this.isNew) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  this._passwordModified = false;
});

// Compares a plaintext candidate password against the stored hash.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
