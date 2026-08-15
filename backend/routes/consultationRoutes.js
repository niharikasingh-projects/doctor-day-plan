const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
	createConsultation,
	searchPatients,
	getHistory,
	downloadPrescription,
} = require('../controllers/consultationController');

const router = express.Router();

router.post('/', verifyToken, requireRole('doctor'), createConsultation);
router.get('/search', verifyToken, requireRole('doctor'), searchPatients);
router.get('/patient/:patientId', verifyToken, requireRole('doctor', 'patient'), getHistory);
router.get('/:id/download', verifyToken, requireRole('doctor', 'patient'), downloadPrescription);

module.exports = router;
