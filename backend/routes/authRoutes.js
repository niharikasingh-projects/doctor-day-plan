const express = require('express');
const { registerPatient, registerDoctor, loginUser } = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerPatient);
router.post('/register/doctor', registerDoctor);
router.post('/login', loginUser);

module.exports = router;
