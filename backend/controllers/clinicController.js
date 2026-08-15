const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// POST /api/clinics (Doctor only) — creates a new clinic owned by the authenticated doctor.
const createClinic = async (req, res) => {
  try {
    const { name, address, contactPhone, scheduleRules } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required.' });
    }

    const clinic = new Clinic({
      doctorId: req.user.userId,
      name,
      address,
      contactPhone,
      scheduleRules,
    });

    await clinic.save();

    return res.status(201).json(clinic);
  } catch (error) {
    console.error('createClinic error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/clinics (Doctor/Patient) — lists active clinics with doctor details for browsing/booking.
const getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({ status: 'active' })
      .populate('doctorId', 'email doctorProfile.name doctorProfile.specialization')
      .sort({ name: 1 });

    return res.status(200).json(clinics);
  } catch (error) {
    console.error('getAllClinics error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/clinics/my-clinics (Doctor only) — lists clinics owned by the authenticated doctor.
const getDoctorClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({ doctorId: req.user.userId })
      .populate('doctorId', 'doctorProfile')
      .sort({ createdAt: -1 });
    return res.status(200).json(clinics);
  } catch (error) {
    console.error('getDoctorClinics error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/clinics/:clinicId (Doctor only) — updates clinic details and replaces its weekly schedule.
const updateClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { name, address, contactPhone, status, scheduleRules } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (contactPhone !== undefined) updates.contactPhone = contactPhone;
    if (status !== undefined) updates.status = status;
    if (scheduleRules !== undefined) updates.scheduleRules = scheduleRules;

    const clinic = await Clinic.findOneAndUpdate(
      { _id: clinicId, doctorId: req.user.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found or not owned by this doctor.' });
    }

    return res.status(200).json(clinic);
  } catch (error) {
    console.error('updateClinic error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/clinics/:clinicId (Doctor only) — archives a clinic without breaking historical references.
const deleteClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findOneAndUpdate(
      { _id: clinicId, doctorId: req.user.userId },
      { $set: { status: 'inactive' } },
      { new: true }
    );

    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found or not owned by this doctor.' });
    }

    return res.status(200).json({ message: 'Clinic archived successfully.', clinic });
  } catch (error) {
    console.error('deleteClinic error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PATCH /api/clinics/unavailable-dates (Doctor only) — pushes a leave date into doctorProfile.unavailableDates.
const addUnavailableDate = async (req, res) => {
  try {
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required.' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, role: 'doctor' },
      { $push: { 'doctorProfile.unavailableDates': { date, reason } } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    return res.status(200).json({ unavailableDates: user.doctorProfile.unavailableDates });
  } catch (error) {
    console.error('addUnavailableDate error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/clinics/:clinicId/slots (Doctor/Patient) — generates raw available slot strings for a date.
const getAvailableSlotsForPatient = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found.' });
    }

    const doctor = await User.findById(clinic.doctorId);
    if (!doctor || !doctor.doctorProfile) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const targetDate = new Date(date);
    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'date query parameter is invalid.' });
    }

    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const rule = clinic.scheduleRules.find((scheduleRule) => scheduleRule.dayOfWeek === dayOfWeek);

    if (!rule) {
      return res.status(200).json({ slots: [] });
    }

    const isUnavailable = doctor.doctorProfile.unavailableDates.some(
      (entry) => new Date(entry.date).toDateString() === targetDate.toDateString()
    );

    if (isUnavailable) {
      return res.status(200).json({ slots: [] });
    }

    const slotDurationMins = doctor.doctorProfile.defaultSlotDurationMins || 15;
    const [startHour, startMinute] = rule.startTime.split(':').map(Number);
    const [endHour, endMinute] = rule.endTime.split(':').map(Number);

    const generatedSlots = [];
    let cursorMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (cursorMinutes + slotDurationMins <= endMinutes) {
      const hours = String(Math.floor(cursorMinutes / 60)).padStart(2, '0');
      const minutes = String(cursorMinutes % 60).padStart(2, '0');
      generatedSlots.push(`${hours}:${minutes}`);
      cursorMinutes += slotDurationMins;
    }

    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const activeAppointments = await Appointment.find({
      clinicId,
      appointmentDate: { $gte: targetDate, $lt: nextDate },
      status: { $in: ['pending', 'confirmed', 'completed'] },
    }).select('slotTime -_id');
    const bookedSlots = activeAppointments.map((appointment) => appointment.slotTime);
    const bookedSlotSet = new Set(bookedSlots);
    const slots = generatedSlots.filter((slot) => !bookedSlotSet.has(slot));

    return res.status(200).json({ slots, allSlots: generatedSlots, bookedSlots });
  } catch (error) {
    console.error('getAvailableSlotsForPatient error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/clinics/:clinicId/monthly-availability (Doctor/Patient) — per-date availability flags for a whole month, used to highlight a calendar.
const getMonthlyAvailability = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const { month } = req.query; // format: "YYYY-MM"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month query parameter is required in YYYY-MM format.' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found.' });
    }

    const doctor = await User.findById(clinic.doctorId);
    if (!doctor || !doctor.doctorProfile) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const unavailableDateStrings = new Set(
      doctor.doctorProfile.unavailableDates.map((entry) => new Date(entry.date).toDateString())
    );

    const availability = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const currentDate = new Date(Date.UTC(year, monthNumber - 1, day));
      const dateKey = currentDate.toISOString().slice(0, 10);
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

      const hasScheduleRule = clinic.scheduleRules.some((rule) => rule.dayOfWeek === dayOfWeek);
      const isUnavailable = unavailableDateStrings.has(currentDate.toDateString());

      availability[dateKey] = hasScheduleRule && !isUnavailable;
    }

    return res.status(200).json({ availability });
  } catch (error) {
    console.error('getMonthlyAvailability error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  createClinic,
  getAllClinics,
  getDoctorClinics,
  updateClinic,
  deleteClinic,
  addUnavailableDate,
  getAvailableSlotsForPatient,
  getMonthlyAvailability,
};
