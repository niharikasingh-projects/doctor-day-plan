const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/register (Public) — registers a new patient account.
const registerPatient = async (req, res) => {
  try {
    const { email, password, phone, patientProfile } = req.body;

    if (!email || !password || !patientProfile) {
      return res.status(400).json({ error: 'email, password, and patientProfile are required.' });
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
const registerDoctor = async (req, res) => {
  try {
    const { email, password, phone, doctorProfile } = req.body;

    if (!email || !password || !doctorProfile?.name) {
      return res.status(400).json({ error: 'email, password, and doctorProfile.name are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
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

module.exports = { registerPatient, registerDoctor, loginUser };
