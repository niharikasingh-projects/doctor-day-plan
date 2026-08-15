const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Clinic;
let Appointment;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = require('../server'));
  User = require('../models/User');
  Clinic = require('../models/Clinic');
  Appointment = require('../models/Appointment');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Clinic.deleteMany({});
  await Appointment.deleteMany({});
});

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
    doctorProfile: { name: 'Test Doctor' },
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
    doctorProfile: { name: 'Profile Doctor', specialization: 'General Medicine' },
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
  const doctor = await User.create({
    email: 'reschedule-doctor@test.example',
    password: 'Doctor@123',
    role: 'doctor',
    doctorProfile: { name: 'Reschedule Doctor' },
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
    appointmentDate: '2026-08-17',
    slotTime: '09:00',
    status: 'pending',
  });
  const conflict = await Appointment.create({
    doctorId: doctor._id,
    patientId: patient._id,
    clinicId: clinic._id,
    appointmentDate: '2026-08-17',
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
    .send({ appointmentDate: '2026-08-17', slotTime: '10:00' });
  expect(rejected.statusCode).toBe(400);

  const moved = await request(app)
    .patch(`/api/appointments/${appointment._id}/reschedule`)
    .set('Authorization', `Bearer ${token}`)
    .send({ appointmentDate: '2026-08-17', slotTime: '09:30' });
  expect(moved.statusCode).toBe(200);
  expect(moved.body.slotTime).toBe('09:30');
  expect(moved.body.status).toBe('pending');
});
