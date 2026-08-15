const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  createAppointment,
  updateStatus,
  patientCheckIn,
  getTodayAppointments,
  getUpcomingAppointments,
  getMyAppointments,
} = require('../controllers/appointmentController');

const router = express.Router();

router.post('/', verifyToken, requireRole('patient'), createAppointment);
router.get('/today', verifyToken, requireRole('doctor'), getTodayAppointments);
router.get('/upcoming', verifyToken, requireRole('doctor'), getUpcomingAppointments);
router.get('/my', verifyToken, requireRole('patient'), getMyAppointments);
router.patch('/:id/status', verifyToken, requireRole('doctor', 'patient'), updateStatus);
router.patch('/:id/checkin', verifyToken, requireRole('patient'), patientCheckIn);

module.exports = router;
