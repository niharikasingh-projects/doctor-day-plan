const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const NOTIFICATIONS_LOG = path.join(__dirname, '..', 'logs', 'notifications.log');

const readNotificationsLog = () =>
  fs.existsSync(NOTIFICATIONS_LOG) ? fs.readFileSync(NOTIFICATIONS_LOG, 'utf8') : '';

let mongoServer;
let app;
let User;
let Clinic;
let Appointment;
let Consultation;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = require('../server'));
  User = require('../models/User');
  Clinic = require('../models/Clinic');
  Appointment = require('../models/Appointment');
  Consultation = require('../models/Consultation');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Clinic.deleteMany({});
  await Appointment.deleteMany({});
  await Consultation.deleteMany({});
});

// Helper: spins up a doctor+patient+clinic trio and returns them with a doctor JWT.
const seedDoctorPatientClinic = async (suffix) => {
  const doctor = await User.create({
    email: `doctor-${suffix}@test.example`,
    password: 'Doctor@123',
    role: 'doctor',
    doctorProfile: { name: `Doctor ${suffix}`, licenseNumber: `LIC-${suffix}` },
  });
  const patient = await User.create({
    email: `patient-${suffix}@test.example`,
    password: 'Patient@123',
    phone: '+919800009999',
    role: 'patient',
    patientProfile: { name: `Patient ${suffix}`, dob: '1990-01-01', gender: 'Other' },
  });
  const clinic = await Clinic.create({
    doctorId: doctor._id,
    name: `Clinic ${suffix}`,
    address: 'Pune, Maharashtra',
    scheduleRules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00' }],
  });
  const login = await request(app).post('/api/auth/login').send({
    email: `doctor-${suffix}@test.example`,
    password: 'Doctor@123',
  });
  return { doctor, patient, clinic, doctorToken: login.body.token };
};

test('registers a patient, hashes password, and logs in with JWT', async () => {
  const registration = await request(app).post('/api/auth/register').send({
    email: 'patient@test.example',
    password: 'Patient@123',
    phone: '+919800000001',
    patientProfile: { name: 'Test Patient', dob: '1990-01-01', gender: 'Other' },
  });

  expect(registration.statusCode).toBe(201);
  const user = await User.findOne({ email: 'patient@test.example' }).select('+passwordHash');
  expect(user.passwordHash).not.toBe('Patient@123');
  expect(await user.comparePassword('Patient@123')).toBe(true);

  const login = await request(app).post('/api/auth/login').send({
    email: 'patient@test.example',
    password: 'Patient@123',
  });
  expect(login.statusCode).toBe(200);
  expect(login.body.role).toBe('patient');
  expect(login.body.token).toEqual(expect.any(String));
});

test('rejects login for an inactive user', async () => {
  const user = new User({
    email: 'inactive@test.example',
    password: 'Patient@123',
    phone: '+919800000002',
    role: 'patient',
    patientProfile: { name: 'Inactive Patient', dob: '1990-01-01', gender: 'Other' },
    isActive: false,
  });
  await user.save();

  const response = await request(app).post('/api/auth/login').send({
    email: 'inactive@test.example',
    password: 'Patient@123',
  });
  expect(response.statusCode).toBe(403);
});

test('enforces unique clinic date and slot bookings', async () => {
  const doctor = await User.create({
    email: 'doctor@test.example',
    password: 'Doctor@123',
    role: 'doctor',
    doctorProfile: { name: 'Test Doctor', licenseNumber: 'LIC-UNIQ-1' },
  });
  const patient = await User.create({
    email: 'patient2@test.example',
    password: 'Patient@123',
    phone: '+919800000003',
    role: 'patient',
    patientProfile: { name: 'Second Patient', dob: '1990-01-01', gender: 'Other' },
  });
  const clinic = await Clinic.create({
    doctorId: doctor._id,
    name: 'Test Clinic',
    address: 'Pune, Maharashtra',
    scheduleRules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' }],
  });
  const appointmentData = {
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: '2026-08-17',
    slotTime: '09:00',
  };

  await Appointment.create(appointmentData);
  await expect(Appointment.create(appointmentData)).rejects.toMatchObject({ code: 11000 });
});

test('allows an authenticated doctor to update their profile and clinic schedule', async () => {
  const registration = await request(app).post('/api/auth/register/doctor').send({
    email: 'profile-doctor@test.example',
    password: 'Doctor@123',
    doctorProfile: { name: 'Profile Doctor', specialization: 'General Medicine', licenseNumber: 'LIC-PROFILE-1' },
  });
  expect(registration.statusCode).toBe(201);

  const login = await request(app).post('/api/auth/login').send({
    email: 'profile-doctor@test.example',
    password: 'Doctor@123',
  });
  const token = login.body.token;

  const profile = await request(app)
    .patch('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ doctorProfile: { name: 'Updated Doctor', defaultSlotDurationMins: 20 } });
  expect(profile.statusCode).toBe(200);
  expect(profile.body.doctorProfile.name).toBe('Updated Doctor');

  const clinic = await request(app)
    .post('/api/clinics')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Profile Clinic',
      address: 'Pune, Maharashtra',
      scheduleRules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00' }],
    });
  expect(clinic.statusCode).toBe(201);

  const update = await request(app)
    .patch(`/api/clinics/${clinic.body._id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ scheduleRules: [{ dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:00' }] });
  expect(update.statusCode).toBe(200);
  expect(update.body.scheduleRules[0].dayOfWeek).toBe('Tuesday');
});

test('reschedules an appointment and rejects a conflicting active slot', async () => {
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const doctor = await User.create({
    email: 'reschedule-doctor@test.example',
    password: 'Doctor@123',
    role: 'doctor',
    doctorProfile: { name: 'Reschedule Doctor', licenseNumber: 'LIC-RESCHED-1' },
  });
  const patient = await User.create({
    email: 'reschedule-patient@test.example',
    password: 'Patient@123',
    phone: '+919800000004',
    role: 'patient',
    patientProfile: { name: 'Reschedule Patient', dob: '1990-01-01', gender: 'Other' },
  });
  const clinic = await Clinic.create({
    doctorId: doctor._id,
    name: 'Reschedule Clinic',
    address: 'Mumbai, Maharashtra',
    scheduleRules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '11:00' }],
  });
  const appointment = await Appointment.create({
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: futureDate,
    slotTime: '09:00',
    status: 'pending',
  });
  const conflict = await Appointment.create({
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: futureDate,
    slotTime: '10:00',
    status: 'confirmed',
  });
  expect(conflict).toBeDefined();

  const login = await request(app).post('/api/auth/login').send({
    email: 'reschedule-doctor@test.example',
    password: 'Doctor@123',
  });
  const token = login.body.token;

  const rejected = await request(app)
    .patch(`/api/appointments/${appointment._id}/reschedule`)
    .set('Authorization', `Bearer ${token}`)
    .send({ appointmentDate: futureDate, slotTime: '10:00' });
  expect(rejected.statusCode).toBe(400);

  const moved = await request(app)
    .patch(`/api/appointments/${appointment._id}/reschedule`)
    .set('Authorization', `Bearer ${token}`)
    .send({ appointmentDate: futureDate, slotTime: '09:30' });
  expect(moved.statusCode).toBe(200);
  expect(moved.body.slotTime).toBe('09:30');
  expect(moved.body.status).toBe('pending');
});

// ---------------------------------------------------------------------------
// Guardrail tests for the v1.1 feature set (forgot password, license rule,
// diagnosis search, pagination, closed-clinic guard, PDF download).
// ---------------------------------------------------------------------------

test('rejects doctor registration without a license number and enforces uniqueness', async () => {
  const missingLicense = await request(app).post('/api/auth/register/doctor').send({
    email: 'no-license@test.example',
    password: 'Doctor@123',
    doctorProfile: { name: 'No License Doctor' },
  });
  expect(missingLicense.statusCode).toBe(400);
  expect(missingLicense.body.error).toMatch(/license/i);

  const first = await request(app).post('/api/auth/register/doctor').send({
    email: 'licensed-one@test.example',
    password: 'Doctor@123',
    doctorProfile: { name: 'Licensed One', licenseNumber: 'LIC-DUP-1' },
  });
  expect(first.statusCode).toBe(201);

  const duplicate = await request(app).post('/api/auth/register/doctor').send({
    email: 'licensed-two@test.example',
    password: 'Doctor@123',
    doctorProfile: { name: 'Licensed Two', licenseNumber: 'LIC-DUP-1' },
  });
  expect(duplicate.statusCode).toBe(400);
  expect(duplicate.body.error).toMatch(/license/i);
});

test('rejects weak passwords and invalid phone numbers on patient registration', async () => {
  const weakPassword = await request(app).post('/api/auth/register').send({
    email: 'weak@test.example',
    password: 'short',
    phone: '+919800000050',
    patientProfile: { name: 'Weak Password', dob: '1990-01-01', gender: 'Other' },
  });
  expect(weakPassword.statusCode).toBe(400);

  const badPhone = await request(app).post('/api/auth/register').send({
    email: 'badphone@test.example',
    password: 'Patient@123',
    phone: 'abc',
    patientProfile: { name: 'Bad Phone', dob: '1990-01-01', gender: 'Other' },
  });
  expect(badPhone.statusCode).toBe(400);
});

test('forgot-password issues a token and reset-password sets a new login password', async () => {
  await request(app).post('/api/auth/register').send({
    email: 'reset@test.example',
    password: 'Patient@123',
    phone: '+919800000060',
    patientProfile: { name: 'Reset Patient', dob: '1990-01-01', gender: 'Other' },
  });

  // Notifications are enabled by default in the test env, so the code must NOT
  // be returned in the response — it is dispatched via the notification service
  // (demo mode outbox in tests).
  const logBefore = readNotificationsLog().length;
  const forgot = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'reset@test.example' });
  expect(forgot.statusCode).toBe(200);
  expect(forgot.body.resetToken).toBeUndefined();

  const newEntries = readNotificationsLog().slice(logBefore);
  expect(newEntries).toContain('Your password reset code');
  const tokenMatch = newEntries.match(/valid for 15 minutes\):\s*\n\s*\n([a-f0-9]{64})/i);
  expect(tokenMatch).not.toBeNull();
  const issuedToken = tokenMatch[1];

  const reset = await request(app).post('/api/auth/reset-password').send({
    email: 'reset@test.example',
    token: issuedToken,
    newPassword: 'NewPatient@456',
  });
  expect(reset.statusCode).toBe(200);

  const oldLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'reset@test.example', password: 'Patient@123' });
  expect(oldLogin.statusCode).toBe(401);

  const newLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'reset@test.example', password: 'NewPatient@456' });
  expect(newLogin.statusCode).toBe(200);

  const reusedToken = await request(app).post('/api/auth/reset-password').send({
    email: 'reset@test.example',
    token: issuedToken,
    newPassword: 'Another@789',
  });
  expect(reusedToken.statusCode).toBe(400);
});

test('public config exposes the notifications flag', async () => {
  const response = await request(app).get('/api/auth/config');
  expect(response.statusCode).toBe(200);
  expect(response.body).toHaveProperty('notificationsEnabled');
  expect(typeof response.body.notificationsEnabled).toBe('boolean');
});

test('doctor patient search matches consultation diagnosis text', async () => {
  const { doctor, patient, clinic, doctorToken } = await seedDoctorPatientClinic('diag');
  const appointment = await Appointment.create({
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: '2026-08-10',
    slotTime: '09:00',
    status: 'completed',
  });
  await Consultation.create({
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    clinicId: clinic._id,
    diagnosis: 'Chronic Migraine',
    medicines: [{ name: 'Cetirizine 10', dosage: '0-0-1', durationDays: 5 }],
  });

  const response = await request(app)
    .get('/api/consultations/search?query=migraine')
    .set('Authorization', `Bearer ${doctorToken}`);
  expect(response.statusCode).toBe(200);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0]._id).toBe(String(patient._id));
  expect(response.body.data[0].matchedDiagnoses).toContain('Chronic Migraine');
  expect(response.body.pagination.total).toBe(1);

  const noMatch = await request(app)
    .get('/api/consultations/search?query=zzz-no-such-illness')
    .set('Authorization', `Bearer ${doctorToken}`);
  expect(noMatch.statusCode).toBe(200);
  expect(noMatch.body.data).toHaveLength(0);
});

test('patient appointments endpoint returns a paginated envelope', async () => {
  const { doctor, patient, clinic } = await seedDoctorPatientClinic('paged');
  const appointmentDocs = [];
  for (let index = 0; index < 15; index += 1) {
    appointmentDocs.push({
      doctorId: doctor._id,
      patientId: patient._id,
      clinicId: clinic._id,
      appointmentDate: '2026-08-17',
      slotTime: `09:${String(index).padStart(2, '0')}`,
      status: 'confirmed',
    });
  }
  await Appointment.insertMany(appointmentDocs);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'patient-paged@test.example', password: 'Patient@123' });

  const pageOne = await request(app)
    .get('/api/appointments/my?page=1&limit=10')
    .set('Authorization', `Bearer ${login.body.token}`);
  expect(pageOne.statusCode).toBe(200);
  expect(pageOne.body.data).toHaveLength(10);
  expect(pageOne.body.pagination).toMatchObject({ total: 15, page: 1, totalPages: 2 });

  const pageTwo = await request(app)
    .get('/api/appointments/my?page=2&limit=10')
    .set('Authorization', `Bearer ${login.body.token}`);
  expect(pageTwo.body.data).toHaveLength(5);

  const exportAll = await request(app)
    .get('/api/appointments/my?all=true')
    .set('Authorization', `Bearer ${login.body.token}`);
  expect(exportAll.body.data).toHaveLength(15);
});

test('booking against a closed clinic is rejected and clinics list includes closed clinics', async () => {
  const { doctor, clinic, doctorToken } = await seedDoctorPatientClinic('closed');
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  clinic.status = 'inactive';
  await clinic.save();

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'patient-closed@test.example', password: 'Patient@123' });

  const booking = await request(app)
    .post('/api/appointments')
    .set('Authorization', `Bearer ${login.body.token}`)
    .send({
      clinicId: clinic._id,
      doctorId: doctor._id,
      appointmentDate: futureDate,
      slotTime: '09:00',
    });
  expect(booking.statusCode).toBe(400);
  expect(booking.body.error).toMatch(/closed/i);

  const clinics = await request(app)
    .get('/api/clinics')
    .set('Authorization', `Bearer ${doctorToken}`);
  expect(clinics.statusCode).toBe(200);
  const listed = clinics.body.find((entry) => String(entry._id) === String(clinic._id));
  expect(listed).toBeDefined();
  expect(listed.status).toBe('inactive');
});

test('prescription download streams a PDF for the treating doctor', async () => {
  const { doctor, patient, clinic, doctorToken } = await seedDoctorPatientClinic('pdf');
  const appointment = await Appointment.create({
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: '2026-08-10',
    slotTime: '09:00',
    status: 'completed',
  });
  const consultation = await Consultation.create({
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: doctor._id,
    clinicId: clinic._id,
    diagnosis: 'Seasonal Allergic Rhinitis',
    medicines: [{ name: 'Cetirizine 10', dosage: '0-0-1', durationDays: 5 }],
  });

  const response = await request(app)
    .get(`/api/consultations/${consultation._id}/download`)
    .set('Authorization', `Bearer ${doctorToken}`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('application/pdf');
  expect(response.headers['content-disposition']).toContain('prescription-');
  expect(Buffer.isBuffer(response.body)).toBe(true);
  expect(response.body.slice(0, 4).toString()).toBe('%PDF');
});

test('doctor public profile exposes license number to patients', async () => {
  const { doctor, doctorToken } = await seedDoctorPatientClinic('public');

  const response = await request(app)
    .get(`/api/auth/doctors/${doctor._id}`)
    .set('Authorization', `Bearer ${doctorToken}`);
  expect(response.statusCode).toBe(200);
  expect(response.body.doctor.licenseNumber).toBe('LIC-public');
  expect(response.body.doctor.name).toBe('Doctor public');
  expect(response.body.clinics).toHaveLength(1);
});

test('booking and patient cancellation fire email + SMS notifications (demo mode)', async () => {
  const { doctor, patient, clinic } = await seedDoctorPatientClinic('notify');
  const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const patientLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'patient-notify@test.example', password: 'Patient@123' });
  const patientToken = patientLogin.body.token;

  const logBefore = readNotificationsLog();

  const booking = await request(app)
    .post('/api/appointments')
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ clinicId: clinic._id, doctorId: doctor._id, appointmentDate: futureDate, slotTime: '09:00' });
  expect(booking.statusCode).toBe(201);

  const afterBooking = readNotificationsLog();
  const bookingEntries = afterBooking.slice(logBefore.length);
  expect(bookingEntries).toContain('DEMO EMAIL');
  expect(bookingEntries).toContain('DEMO SMS');
  expect(bookingEntries).toContain('patient-notify@test.example');
  expect(bookingEntries).toContain('Appointment booked');

  const cancellation = await request(app)
    .patch(`/api/appointments/${booking.body._id}/status`)
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ status: 'cancelled', cancelReason: 'Feeling better already.' });
  expect(cancellation.statusCode).toBe(200);

  const afterCancel = readNotificationsLog();
  const cancelEntries = afterCancel.slice(afterBooking.length);
  expect(cancelEntries).toContain('Appointment cancelled');
  expect(cancelEntries).toContain('doctor-notify@test.example');
  expect(cancelEntries).toContain('Feeling better already.');
});

test('a doctor who treated a patient can download prescriptions written by another doctor', async () => {
  // Consultation authored by doctor A...
  const { doctor: authorDoctor, patient, clinic } = await seedDoctorPatientClinic('author');
  const appointment = await Appointment.create({
    doctorId: authorDoctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: '2026-08-10',
    slotTime: '09:00',
    status: 'completed',
  });
  const consultation = await Consultation.create({
    appointmentId: appointment._id,
    patientId: patient._id,
    doctorId: authorDoctor._id,
    clinicId: clinic._id,
    diagnosis: 'Hypertension',
    medicines: [{ name: 'Pantoprazole 40', dosage: '1-0-0', durationDays: 7 }],
  });

  // ...while doctor B has their own appointment with the same patient.
  const { doctor: viewingDoctor, clinic: viewingClinic, doctorToken: viewingToken } =
    await seedDoctorPatientClinic('viewer');
  await Appointment.create({
    doctorId: viewingDoctor._id,
    patientId: patient._id,
    clinicId: viewingClinic._id,
    appointmentDate: '2026-08-12',
    slotTime: '09:00',
    status: 'confirmed',
  });

  const allowed = await request(app)
    .get(`/api/consultations/${consultation._id}/download`)
    .set('Authorization', `Bearer ${viewingToken}`)
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  expect(allowed.statusCode).toBe(200);
  expect(allowed.headers['content-type']).toContain('application/pdf');

  // A doctor with no relationship to the patient is still rejected.
  const { doctorToken: strangerToken } = await seedDoctorPatientClinic('stranger');
  const forbidden = await request(app)
    .get(`/api/consultations/${consultation._id}/download`)
    .set('Authorization', `Bearer ${strangerToken}`);
  expect(forbidden.statusCode).toBe(403);
});
