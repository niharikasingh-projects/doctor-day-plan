const express = require('express');
const {
  registerPatient,
  registerDoctor,
  loginUser,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  getDoctorPublicProfile,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerPatient);
router.post('/register/doctor', registerDoctor);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.get('/doctors/:doctorId', verifyToken, getDoctorPublicProfile);

module.exports = router;
