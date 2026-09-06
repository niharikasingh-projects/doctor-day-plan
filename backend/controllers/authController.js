const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidObjectId,
  isValidLicenseNumber,
  isPastDate,
} = require('../utils/validators');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const GENDERS = ['Male', 'Female', 'Other'];

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// POST /api/auth/register (Public) — registers a new patient account.
const registerPatient = async (req, res) => {
  try {
    const { email, password, phone, patientProfile } = req.body;

    if (!email || !password || !patientProfile) {
      return res.status(400).json({ error: 'email, password, and patientProfile are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters and contain a letter and a number.' });
    }
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ error: 'A valid phone number (7-15 digits, optional +) is required for patients.' });
    }
    if (!patientProfile.name || !String(patientProfile.name).trim()) {
      return res.status(400).json({ error: 'patientProfile.name is required.' });
    }
    if (!patientProfile.dob || !isPastDate(patientProfile.dob)) {
      return res.status(400).json({ error: 'patientProfile.dob must be a valid date in the past.' });
    }
    if (!GENDERS.includes(patientProfile.gender)) {
      return res.status(400).json({ error: 'patientProfile.gender must be one of Male, Female, or Other.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const user = new User({
      email,
      password,
      phone,
      role: 'patient',
      patientProfile,
    });

    await user.save();

    return res.status(201).json({ message: 'Patient registered successfully.' });
  } catch (error) {
    console.error('registerPatient error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/register/doctor (Public) — registers a new doctor account.
// doctorProfile.licenseNumber is mandatory and must be unique across doctors.
const registerDoctor = async (req, res) => {
  try {
    const { email, password, phone, doctorProfile } = req.body;

    if (!email || !password || !doctorProfile?.name) {
      return res.status(400).json({ error: 'email, password, and doctorProfile.name are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters and contain a letter and a number.' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid phone number (7-15 digits, optional +).' });
    }
    if (!doctorProfile.licenseNumber || !isValidLicenseNumber(doctorProfile.licenseNumber)) {
      return res
        .status(400)
        .json({ error: 'A valid medical license number (5-20 letters, digits, "-" or "/") is required for doctors.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const existingLicense = await User.findOne({
      role: 'doctor',
      'doctorProfile.licenseNumber': doctorProfile.licenseNumber.trim(),
    });
    if (existingLicense) {
      return res.status(400).json({ error: 'This medical license number is already registered.' });
    }

    const user = new User({
      email,
      password,
      phone,
      role: 'doctor',
      doctorProfile,
    });

    await user.save();

    return res.status(201).json({ message: 'Doctor registered successfully.' });
  } catch (error) {
    console.error('registerDoctor error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This medical license number is already registered.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/login (Public) — authenticates a user and issues a JWT.
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account is inactive. Please contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const name = user.role === 'doctor' ? user.doctorProfile?.name : user.patientProfile?.name;

    return res.status(200).json({
      token,
      role: user.role,
      user: { email: user.email, id: user._id, name },
    });
  } catch (error) {
    console.error('loginUser error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/forgot-password (Public) — issues a short-lived password reset token.
// Always answers with a generic message so account existence is not leaked.
// In non-production environments the token is returned in the response (and logged)
// because this project has no email delivery service wired up.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select(
      '+passwordResetToken +passwordResetExpires'
    );

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = hashResetToken(rawToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      console.log(`Password reset requested for ${user.email}. Reset token (valid 15 min): ${rawToken}`);

      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          message: 'If an account exists for this email, a reset code has been generated.',
          resetToken: rawToken,
          expiresInMinutes: RESET_TOKEN_TTL_MS / 60000,
        });
      }
    }

    return res
      .status(200)
      .json({ message: 'If an account exists for this email, a reset code has been generated.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/reset-password (Public) — validates a reset token and sets a new password.
const resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'email, token, and newPassword are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!isValidPassword(newPassword)) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 8 characters and contain a letter and a number.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: hashResetToken(String(token)),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ error: 'The reset code is invalid or has expired.' });
    }

    user.password = newPassword; // virtual setter — hashed by the pre-save hook
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/auth/profile (Protected) — returns the authenticated user's profile.
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'Active user profile not found.' });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/auth/profile (Protected) — updates only the authenticated user's profile fields.
// Uses dot-notation $set so omitted sub-document fields (e.g. licenseNumber,
// unavailableDates) are preserved instead of being wiped by a full replacement.
const updateProfile = async (req, res) => {
  try {
    const { phone, doctorProfile, patientProfile } = req.body;
    const updates = {};

    if (phone !== undefined) {
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ error: 'Please provide a valid phone number (7-15 digits, optional +).' });
      }
      updates.phone = phone;
    }

    if (req.user.role === 'doctor' && doctorProfile) {
      const editableDoctorFields = [
        'name',
        'specialization',
        'qualification',
        'experienceYears',
        'bio',
        'licenseNumber',
        'defaultSlotDurationMins',
        'avgConsultationMins',
      ];
      editableDoctorFields.forEach((field) => {
        if (doctorProfile[field] !== undefined) {
          updates[`doctorProfile.${field}`] = doctorProfile[field];
        }
      });
      if (updates['doctorProfile.licenseNumber'] !== undefined) {
        if (!isValidLicenseNumber(updates['doctorProfile.licenseNumber'])) {
          return res
            .status(400)
            .json({ error: 'Please provide a valid medical license number (5-20 letters, digits, "-" or "/").' });
        }
        const licenseOwner = await User.findOne({
          _id: { $ne: req.user.userId },
          'doctorProfile.licenseNumber': String(updates['doctorProfile.licenseNumber']).trim(),
        });
        if (licenseOwner) {
          return res.status(400).json({ error: 'This medical license number is already registered.' });
        }
      }
      if (updates['doctorProfile.name'] !== undefined && !String(updates['doctorProfile.name']).trim()) {
        return res.status(400).json({ error: 'doctorProfile.name cannot be empty.' });
      }
    }

    if (req.user.role === 'patient' && patientProfile) {
      const editablePatientFields = ['name', 'dob', 'gender'];
      editablePatientFields.forEach((field) => {
        if (patientProfile[field] !== undefined) {
          updates[`patientProfile.${field}`] = patientProfile[field];
        }
      });
      if (updates['patientProfile.name'] !== undefined && !String(updates['patientProfile.name']).trim()) {
        return res.status(400).json({ error: 'patientProfile.name cannot be empty.' });
      }
      if (updates['patientProfile.dob'] !== undefined && !isPastDate(updates['patientProfile.dob'])) {
        return res.status(400).json({ error: 'patientProfile.dob must be a valid date in the past.' });
      }
      if (updates['patientProfile.gender'] !== undefined && !GENDERS.includes(updates['patientProfile.gender'])) {
        return res.status(400).json({ error: 'patientProfile.gender must be one of Male, Female, or Other.' });
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, role: req.user.role, isActive: true },
      { $set: updates },
      { returnDocument: 'after', runValidators: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'Active user profile not found.' });
    return res.status(200).json(user);
  } catch (error) {
    console.error('updateProfile error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This medical license number is already registered.' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/auth/doctors/:doctorId (Doctor/Patient) — public-facing doctor profile
// (name, specialization, qualification, experience, bio, license number) plus the
// doctor's clinics, so patients can verify credentials before booking.
const getDoctorPublicProfile = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!isValidObjectId(doctorId)) {
      return res.status(400).json({ error: 'doctorId is invalid.' });
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor', isActive: true }).select(
      'email doctorProfile'
    );
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const clinics = await Clinic.find({ doctorId: doctor._id })
      .select('name address contactPhone status scheduleRules')
      .sort({ name: 1 });

    return res.status(200).json({
      doctor: {
        id: doctor._id,
        email: doctor.email,
        ...doctor.doctorProfile.toObject(),
      },
      clinics,
    });
  } catch (error) {
    console.error('getDoctorPublicProfile error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  registerPatient,
  registerDoctor,
  loginUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  getDoctorPublicProfile,
};
