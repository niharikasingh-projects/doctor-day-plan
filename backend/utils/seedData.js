// Seeds dummy doctors, patients, and clinics into MongoDB for local testing.
// Run with: npm run seed (from the backend/ directory)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Clinic = require('../models/Clinic');

const DOCTORS = [
  {
    email: 'dr.priya@doctordayplan.test',
    password: 'Doctor@123',
    phone: '+919876543210',
    doctorProfile: {
      name: 'Priya Sharma',
      specialization: 'Cardiology',
      qualification: 'MBBS, MD (Cardiology)',
      experienceYears: 12,
      bio: 'Senior cardiologist focused on preventive heart care.',
      defaultSlotDurationMins: 15,
      avgConsultationMins: 15,
    },
  },
  {
    email: 'dr.arjun@doctordayplan.test',
    password: 'Doctor@123',
    phone: '+919876543211',
    doctorProfile: {
      name: 'Arjun Mehta',
      specialization: 'Dermatology',
      qualification: 'MBBS, MD (Dermatology)',
      experienceYears: 8,
      bio: 'Skin, hair, and cosmetic dermatology specialist.',
      defaultSlotDurationMins: 20,
      avgConsultationMins: 20,
    },
  },
];

const PATIENTS = [
  {
    email: 'patient1@doctordayplan.test',
    password: 'Patient@123',
    phone: '+919812345678',
    patientProfile: {
      name: 'Rahul Verma',
      dob: '1990-05-14',
      gender: 'Male',
    },
  },
  {
    email: 'patient2@doctordayplan.test',
    password: 'Patient@123',
    phone: '+919812345679',
    patientProfile: {
      name: 'Sneha Kapoor',
      dob: '1995-11-02',
      gender: 'Female',
    },
  },
];

const CLINIC_NAMES = ['Sunrise Heart Clinic', 'City Cardiac Care', 'Skin & Glow Dermatology'];

const seed = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding.');

    const seedEmails = [...DOCTORS, ...PATIENTS].map((entry) => entry.email);
    await User.deleteMany({ email: { $in: seedEmails } });
    await Clinic.deleteMany({ name: { $in: CLINIC_NAMES } });

    const createdDoctors = [];
    for (const doctorData of DOCTORS) {
      const doctor = new User({ ...doctorData, role: 'doctor' });
      await doctor.save();
      createdDoctors.push(doctor);
      console.log(`Created doctor: ${doctor.email} (id: ${doctor._id})`);
    }

    for (const patientData of PATIENTS) {
      const patient = new User({ ...patientData, role: 'patient' });
      await patient.save();
      console.log(`Created patient: ${patient.email} (id: ${patient._id})`);
    }

    const [drPriya, drArjun] = createdDoctors;

    const clinics = [
      {
        doctorId: drPriya._id,
        name: 'Sunrise Heart Clinic',
        address: '12 MG Road, Bengaluru, Karnataka',
        contactPhone: '+918012345678',
        status: 'active',
        scheduleRules: [
          { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 'Friday', startTime: '09:00', endTime: '13:00' },
        ],
      },
      {
        doctorId: drPriya._id,
        name: 'City Cardiac Care',
        address: '88 Residency Road, Bengaluru, Karnataka',
        contactPhone: '+918012345679',
        status: 'active',
        scheduleRules: [
          { dayOfWeek: 'Tuesday', startTime: '14:00', endTime: '18:00' },
          { dayOfWeek: 'Thursday', startTime: '14:00', endTime: '18:00' },
          { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '13:00' },
        ],
      },
      {
        doctorId: drArjun._id,
        name: 'Skin & Glow Dermatology',
        address: '45 Park Street, Kolkata, West Bengal',
        contactPhone: '+913312345678',
        status: 'active',
        scheduleRules: [
          { dayOfWeek: 'Monday', startTime: '10:00', endTime: '16:00' },
          { dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '16:00' },
          { dayOfWeek: 'Friday', startTime: '10:00', endTime: '16:00' },
        ],
      },
    ];

    for (const clinicData of clinics) {
      const clinic = new Clinic(clinicData);
      await clinic.save();
      console.log(`Created clinic: ${clinic.name} (id: ${clinic._id})`);
    }

    console.log('\n=== Test Accounts ===');
    console.log('Doctors:');
    DOCTORS.forEach((doctor) => console.log(`  ${doctor.email} / ${doctor.password}`));
    console.log('Patients:');
    PATIENTS.forEach((patient) => console.log(`  ${patient.email} / ${patient.password}`));
    console.log('\nSeeding complete.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
