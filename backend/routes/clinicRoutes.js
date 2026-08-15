const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  createClinic,
  getAllClinics,
  getDoctorClinics,
  addUnavailableDate,
  getAvailableSlotsForPatient,
  getMonthlyAvailability,
} = require('../controllers/clinicController');

const router = express.Router();

router.post('/', verifyToken, requireRole('doctor'), createClinic);
router.get('/', verifyToken, requireRole('doctor', 'patient'), getAllClinics);
router.get('/my-clinics', verifyToken, requireRole('doctor'), getDoctorClinics);
router.patch('/unavailable-dates', verifyToken, requireRole('doctor'), addUnavailableDate);
router.get('/:clinicId/slots', verifyToken, requireRole('doctor', 'patient'), getAvailableSlotsForPatient);
router.get(
  '/:clinicId/monthly-availability',
  verifyToken,
  requireRole('doctor', 'patient'),
  getMonthlyAvailability
);

module.exports = router;
