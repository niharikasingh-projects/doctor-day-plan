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
      licenseNumber: 'MCI-10001',
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
      licenseNumber: 'MCI-10002',
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

// Bulk mock-data configuration: at least 1000 appointment records per doctor and
// at least 100 records for each named patient test account, so pagination,
// search, and Excel export can be exercised against realistic data volumes.
const MOCK_PATIENT_COUNT = 40;
const TARGET_RECORDS_PER_DOCTOR = 1000;
const RECORDS_PER_TEST_PATIENT = 100;
const BULK_CHUNK_SIZE = 500;
const MOCK_PATIENT_PASSWORD = 'Patient@123';
const MOCK_PATIENT_FIRST_NAMES = [
  'Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Krishna', 'Meera',
  'Nikhil', 'Priya', 'Rohan', 'Sanya', 'Aditi', 'Vikram', 'Neha', 'Rahul',
  'Pooja', 'Sanjay', 'Divya', 'Manish',
];
const MOCK_PATIENT_LAST_NAMES = [
  'Sharma', 'Patel', 'Gupta', 'Iyer', 'Khan', 'Reddy', 'Nair', 'Singh',
  'Joshi', 'Das', 'Kulkarni', 'Chopra', 'Bose', 'Menon', 'Rao',
];
const MOCK_DIAGNOSES = [
  'Hypertension', 'Type 2 Diabetes Mellitus', 'Seasonal Allergic Rhinitis',
  'Acute Bronchitis', 'Migraine', 'GERD', 'Atopic Dermatitis', 'Lower Back Pain',
  'Vitamin D Deficiency', 'Iron Deficiency Anemia', 'Upper Respiratory Infection',
  'Asthma', 'Hypothyroidism', 'Eczema', 'Tension Headache',
];
const MOCK_DOSAGES = ['1-0-1', '1-0-0', '0-0-1', '1-1-1', '0-1-0'];
const MOCK_INSTRUCTIONS = [
  'After meals', 'Before breakfast', 'At bedtime', 'With warm water',
  'Avoid dairy around dose', 'Take after dinner',
];

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Builds the list of HH:mm slot strings a rule range produces for a given slot duration.
const slotsForRule = (rule, slotDurationMins) => {
  const [startHour, startMinute] = rule.startTime.split(':').map(Number);
  const [endHour, endMinute] = rule.endTime.split(':').map(Number);
  const slots = [];
  let cursor = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  while (cursor + slotDurationMins <= end) {
    slots.push(`${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
    cursor += slotDurationMins;
  }
  return slots;
};

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
    // Remove previously generated bulk mock patients and every record that touched them.
    const oldMockPatients = await User.find({ email: /^mock\.patient\.\d+@doctordayplan\.test$/ }).select('_id');
    const oldMockPatientIds = oldMockPatients.map((user) => user._id);
    if (oldMockPatientIds.length > 0) {
      await Consultation.deleteMany({ patientId: { $in: oldMockPatientIds } });
      await Appointment.deleteMany({ patientId: { $in: oldMockPatientIds } });
      await User.deleteMany({ _id: { $in: oldMockPatientIds } });
    }
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

    // ------------------------------------------------------------------
    // Bulk mock data: >= 1000 records per doctor, >= 100 per test patient.
    // ------------------------------------------------------------------
    console.log('\nGenerating bulk mock records (this can take a minute)...');

    const mockPatientDocs = [];
    for (let index = 1; index <= MOCK_PATIENT_COUNT; index += 1) {
      mockPatientDocs.push({
        email: `mock.patient.${index}@doctordayplan.test`,
        password: MOCK_PATIENT_PASSWORD,
        phone: `+9197${String(10000000 + index).slice(-8)}`,
        role: 'patient',
        patientProfile: {
          name: `${randomItem(MOCK_PATIENT_FIRST_NAMES)} ${randomItem(MOCK_PATIENT_LAST_NAMES)}`,
          dob: `${randomInt(1955, 2010)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          gender: randomItem(['Male', 'Female', 'Other']),
        },
      });
    }
    // User.create() (not insertMany) so the password-hashing pre-save hook runs per document.
    const mockPatients = await User.create(mockPatientDocs);
    console.log(`Created ${mockPatients.length} mock patients (password: ${MOCK_PATIENT_PASSWORD}).`);

    const allPatients = [...createdPatients, ...mockPatients];
    const medicinePool = medicineDocuments.map((medicine) => medicine.name);
    const usedSlotKeys = new Set();
    const doctorRecordCounts = new Map(createdDoctors.map((doctor) => [String(doctor._id), 0]));

    // Pre-index each clinic's slot grid by weekday name for realistic mock bookings.
    const clinicSlotGrids = createdClinics.map((clinic) => {
      const doctor = createdDoctors.find((entry) => String(entry._id) === String(clinic.doctorId));
      const slotDuration = doctor?.doctorProfile?.defaultSlotDurationMins || 15;
      const byWeekday = {};
      clinic.scheduleRules.forEach((rule) => {
        byWeekday[rule.dayOfWeek] = slotsForRule(rule, slotDuration);
      });
      return { clinic, doctor, byWeekday };
    });

    const appointmentDocs = [];
    const consultationDocs = [];

    const pushMockRecord = ({ doctorGrid, patient, date }) => {
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const slots = doctorGrid.byWeekday[weekday];
      if (!slots || slots.length === 0) return false;

      const slotTime = randomItem(slots);
      const dateKey = date.toISOString().slice(0, 10);
      const slotKey = `${doctorGrid.clinic._id}|${dateKey}|${slotTime}`;
      if (usedSlotKeys.has(slotKey)) return false;
      usedSlotKeys.add(slotKey);

      const isPast = date.getTime() < Date.now();
      const status = isPast
        ? randomItem(['completed', 'completed', 'completed', 'completed', 'cancelled', 'rejected'])
        : randomItem(['pending', 'confirmed']);

      const appointmentId = new mongoose.Types.ObjectId();
      appointmentDocs.push({
        _id: appointmentId,
        clinicId: doctorGrid.clinic._id,
        doctorId: doctorGrid.doctor._id,
        patientId: patient._id,
        appointmentDate: date,
        slotTime,
        status,
        checkedInAt: status === 'completed' ? date : null,
        cancelReason: status === 'cancelled' ? 'Mock cancellation for seed data.' : undefined,
      });

      if (status === 'completed') {
        consultationDocs.push({
          appointmentId,
          patientId: patient._id,
          doctorId: doctorGrid.doctor._id,
          clinicId: doctorGrid.clinic._id,
          diagnosis: randomItem(MOCK_DIAGNOSES),
          clinicalNotes: 'Auto-generated mock consultation for seed data.',
          medicines: Array.from({ length: randomInt(1, 3) }, () => ({
            name: randomItem(medicinePool),
            dosage: randomItem(MOCK_DOSAGES),
            durationDays: randomInt(3, 14),
            instructions: randomItem(MOCK_INSTRUCTIONS),
          })),
        });
      }

      doctorRecordCounts.set(
        String(doctorGrid.doctor._id),
        (doctorRecordCounts.get(String(doctorGrid.doctor._id)) || 0) + 1
      );
      return true;
    };

    const randomMockDate = (minOffset, maxOffset) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() + randomInt(minOffset, maxOffset));
      return date;
    };

    // Guarantee every named test patient reaches at least 100 records.
    for (const patient of createdPatients) {
      let created = 0;
      let guard = 0;
      while (created < RECORDS_PER_TEST_PATIENT && guard < RECORDS_PER_TEST_PATIENT * 40) {
        guard += 1;
        const grid = randomItem(clinicSlotGrids);
        if (pushMockRecord({ doctorGrid: grid, patient, date: randomMockDate(-300, -1) })) {
          created += 1;
        }
      }
      console.log(`Seeded ${created} records for test patient ${patient.email}.`);
    }

    // Top up each doctor to at least 1000 records with random mock patients.
    for (const doctor of createdDoctors) {
      const doctorGrids = clinicSlotGrids.filter((grid) => String(grid.doctor._id) === String(doctor._id));
      let guard = 0;
      while ((doctorRecordCounts.get(String(doctor._id)) || 0) < TARGET_RECORDS_PER_DOCTOR && guard < TARGET_RECORDS_PER_DOCTOR * 60) {
        guard += 1;
        const grid = randomItem(doctorGrids);
        // ~90% historical (completed consultations), ~10% upcoming.
        const date = Math.random() < 0.9 ? randomMockDate(-300, -1) : randomMockDate(1, 30);
        pushMockRecord({ doctorGrid: grid, patient: randomItem(allPatients), date });
      }
      console.log(`Seeded ${doctorRecordCounts.get(String(doctor._id))} appointment records for ${doctor.email}.`);
    }

    for (let index = 0; index < appointmentDocs.length; index += BULK_CHUNK_SIZE) {
      // insertMany: no document middleware exists on Appointment — safe and fast.
      // eslint-disable-next-line no-await-in-loop
      await Appointment.insertMany(appointmentDocs.slice(index, index + BULK_CHUNK_SIZE), { ordered: false });
    }
    for (let index = 0; index < consultationDocs.length; index += BULK_CHUNK_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await Consultation.insertMany(consultationDocs.slice(index, index + BULK_CHUNK_SIZE), { ordered: false });
    }
    console.log(`Bulk insert complete: ${appointmentDocs.length} appointments, ${consultationDocs.length} consultations.`);

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
