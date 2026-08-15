// Seeds dummy doctors, patients, and clinics into MongoDB for local testing.
// Run with: npm run seed (from the backend/ directory)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const Medicine = require('../models/Medicine');

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

const CLINIC_NAMES = [
  'Sunrise Heart Clinic',
  'City Cardiac Care',
  'Skin & Glow Dermatology',
  'Pune Wellness Centre',
];
const MEDICINE_NAMES = ['Atorvastatin 10', 'Cetirizine 10', 'Pantoprazole 40'];

const utcDateAtOffset = (daysFromToday) => {
  const date = new Date();
  const today = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  today.setUTCDate(today.getUTCDate() + daysFromToday);
  return today;
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding.');

    const seedEmails = [...DOCTORS, ...PATIENTS].map((entry) => entry.email);
    const oldUsers = await User.find({ email: { $in: seedEmails } }).select('_id');
    const oldUserIds = oldUsers.map((user) => user._id);
    const oldClinics = await Clinic.find({ name: { $in: CLINIC_NAMES } }).select('_id');
    const oldClinicIds = oldClinics.map((clinic) => clinic._id);

    await Consultation.deleteMany({
      $or: [{ doctorId: { $in: oldUserIds } }, { patientId: { $in: oldUserIds } }, { clinicId: { $in: oldClinicIds } }],
    });
    await Appointment.deleteMany({
      $or: [{ doctorId: { $in: oldUserIds } }, { patientId: { $in: oldUserIds } }, { clinicId: { $in: oldClinicIds } }],
    });
    await User.deleteMany({ email: { $in: seedEmails } });
    await Clinic.deleteMany({ name: { $in: CLINIC_NAMES } });
    await Medicine.deleteMany({ name: { $in: MEDICINE_NAMES } });

    const createdDoctors = [];
    for (const doctorData of DOCTORS) {
      const doctor = new User({ ...doctorData, role: 'doctor' });
      await doctor.save();
      createdDoctors.push(doctor);
      console.log(`Created doctor: ${doctor.email} (id: ${doctor._id})`);
    }

    const createdPatients = [];
    for (const patientData of PATIENTS) {
      const patient = new User({ ...patientData, role: 'patient' });
      await patient.save();
      createdPatients.push(patient);
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
      {
        doctorId: drArjun._id,
        name: 'Pune Wellness Centre',
        address: '21 FC Road, Pune, Maharashtra',
        contactPhone: '+912067890123',
        status: 'active',
        scheduleRules: [
          { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 'Saturday', startTime: '09:00', endTime: '12:00' },
        ],
      },
    ];

    for (const clinicData of clinics) {
      const clinic = new Clinic(clinicData);
      await clinic.save();
      console.log(`Created clinic: ${clinic.name} (id: ${clinic._id})`);
    }

    const createdClinics = await Clinic.find({ name: { $in: CLINIC_NAMES } }).sort({ name: 1 });
    const medicineDocuments = await Medicine.create([
      { name: 'Atorvastatin 10', category: 'Tablet', manufacturer: 'Test Pharma', strength: '10', unit: 'mg' },
      { name: 'Cetirizine 10', category: 'Tablet', manufacturer: 'Test Pharma', strength: '10', unit: 'mg' },
      { name: 'Pantoprazole 40', category: 'Tablet', manufacturer: 'Test Pharma', strength: '40', unit: 'mg' },
    ]);

    const sunriseClinic = createdClinics.find((clinic) => clinic.name === 'Sunrise Heart Clinic');
    const cardiacClinic = createdClinics.find((clinic) => clinic.name === 'City Cardiac Care');
    const dermatologyClinic = createdClinics.find((clinic) => clinic.name === 'Skin & Glow Dermatology');
    const [patientRahul, patientSneha] = createdPatients;
    const [atorvastatin, cetirizine, pantoprazole] = medicineDocuments;

    const todayAppointment = await Appointment.create({
      doctorId: drPriya._id,
      patientId: patientRahul._id,
      clinicId: cardiacClinic._id,
      appointmentDate: utcDateAtOffset(0),
      slotTime: '10:00',
      status: 'confirmed',
      checkedInAt: new Date(),
    });

    const pendingAppointment = await Appointment.create({
      doctorId: drPriya._id,
      patientId: patientSneha._id,
      clinicId: sunriseClinic._id,
      appointmentDate: utcDateAtOffset(1),
      slotTime: '09:00',
      status: 'pending',
    });

    const completedAppointment = await Appointment.create({
      doctorId: drArjun._id,
      patientId: patientRahul._id,
      clinicId: dermatologyClinic._id,
      appointmentDate: utcDateAtOffset(-1),
      slotTime: '10:00',
      status: 'completed',
    });

    const puneAppointment = await Appointment.create({
      doctorId: drArjun._id,
      patientId: patientSneha._id,
      clinicId: createdClinics.find((clinic) => clinic.name === 'Pune Wellness Centre')._id,
      appointmentDate: utcDateAtOffset(3),
      slotTime: '09:00',
      status: 'completed',
    });

    const cancelledAppointment = await Appointment.create({
      doctorId: drArjun._id,
      patientId: patientSneha._id,
      clinicId: dermatologyClinic._id,
      appointmentDate: utcDateAtOffset(5),
      slotTime: '10:20',
      status: 'cancelled',
      cancelReason: 'Patient requested a different date.',
    });

    const rejectedAppointment = await Appointment.create({
      doctorId: drPriya._id,
      patientId: patientRahul._id,
      clinicId: sunriseClinic._id,
      appointmentDate: utcDateAtOffset(6),
      slotTime: '09:15',
      status: 'rejected',
    });

    await Consultation.create({
      appointmentId: completedAppointment._id,
      patientId: patientRahul._id,
      doctorId: drArjun._id,
      clinicId: dermatologyClinic._id,
      diagnosis: 'Seasonal allergic dermatitis',
      clinicalNotes: 'Follow up if symptoms persist beyond one week.',
      medicines: [
        {
          name: cetirizine.name,
          dosage: '0-0-1',
          durationDays: 5,
          instructions: 'After dinner',
        },
        {
          name: pantoprazole.name,
          dosage: '1-0-0',
          durationDays: 5,
          instructions: 'Before breakfast',
        },
      ],
    });

    await Consultation.create({
      appointmentId: puneAppointment._id,
      patientId: patientSneha._id,
      doctorId: drArjun._id,
      clinicId: puneAppointment.clinicId,
      diagnosis: 'Mild contact dermatitis',
      clinicalNotes: 'Avoid the suspected irritant and return if redness increases.',
      medicines: [
        {
          name: atorvastatin.name,
          dosage: '0-0-1',
          durationDays: 7,
          instructions: 'Take after dinner',
        },
      ],
    });

    console.log(`Created appointment: ${todayAppointment._id} (checked in/live queue test)`);
    console.log(`Created appointment: ${pendingAppointment._id} (pending approval test)`);
    console.log(`Created appointment + consultation: ${completedAppointment._id} (medical history/PDF test)`);
    console.log(`Created appointment + consultation: ${puneAppointment._id} (Pune/patient history test)`);
    console.log(`Created cancelled appointment: ${cancelledAppointment._id} (slot release test)`);
    console.log(`Created rejected appointment: ${rejectedAppointment._id} (doctor status test)`);
    console.log(`Created medicine catalog entries: ${atorvastatin.name}, ${cetirizine.name}, ${pantoprazole.name}`);

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
