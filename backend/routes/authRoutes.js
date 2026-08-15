const express = require('express');
const { registerPatient, registerDoctor, loginUser, getProfile, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerPatient);
router.post('/register/doctor', registerDoctor);
router.post('/login', loginUser);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);

module.exports = router;
