// One-time backfill migration for the v1.1 mandatory field
// `doctorProfile.licenseNumber` on pre-existing doctor accounts.
//
// Every doctor user missing a license number receives a unique placeholder of
// the form PENDING-XXXXXX (derived from their ObjectId, matches the schema
// regex /^[A-Za-z0-9\-/]{5,20}$/). Placeholders must be replaced with the real
// license number by the doctor via the Profile page (enforced by validators).
//
// Run with: npm run migrate (from the backend/ directory). Safe to re-run —
// doctors that already have a license number are skipped.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const LICENSE_REGEX = /^[A-Za-z0-9\-/]{5,20}$/;

// Builds a unique placeholder license from the user's ObjectId suffix.
const buildPlaceholderLicense = (userId, usedLicenses) => {
  const suffix = String(userId).slice(-6).toUpperCase();
  let candidate = `PENDING-${suffix}`;
  let counter = 1;
  while (usedLicenses.has(candidate) || !LICENSE_REGEX.test(candidate)) {
    candidate = `PENDING-${suffix}-${counter}`;
    counter += 1;
  }
  usedLicenses.add(candidate);
  return candidate;
};

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from backend/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for license-number backfill migration.');

    // Collect licenses already in use so placeholders never collide with them.
    const licensedDoctors = await User.find({
      role: 'doctor',
      'doctorProfile.licenseNumber': { $exists: true, $nin: [null, ''] },
    }).select('doctorProfile.licenseNumber');
    const usedLicenses = new Set(
      licensedDoctors.map((user) => user.doctorProfile?.licenseNumber).filter(Boolean)
    );

    const doctorsMissingLicense = await User.find({
      role: 'doctor',
      $or: [
        { 'doctorProfile.licenseNumber': { $exists: false } },
        { 'doctorProfile.licenseNumber': null },
        { 'doctorProfile.licenseNumber': '' },
      ],
    }).select('email doctorProfile.name');

    if (doctorsMissingLicense.length === 0) {
      console.log('No doctors are missing a license number — nothing to migrate.');
    }

    for (const doctor of doctorsMissingLicense) {
      const placeholder = buildPlaceholderLicense(doctor._id, usedLicenses);
      // updateOne with dot-notation $set: touches only the new field and never
      // revalidates unrelated legacy data on the document.
      // eslint-disable-next-line no-await-in-loop
      await User.updateOne(
        { _id: doctor._id },
        { $set: { 'doctorProfile.licenseNumber': placeholder } }
      );
      console.log(
        `Backfilled license for ${doctor.email} (Dr. ${doctor.doctorProfile?.name || 'unknown'}): ${placeholder}`
      );
    }

    // Make sure the sparse unique index on doctorProfile.licenseNumber exists.
    await User.syncIndexes();
    console.log('User indexes synchronized (sparse unique licenseNumber index confirmed).');

    const remaining = await User.countDocuments({
      role: 'doctor',
      $or: [
        { 'doctorProfile.licenseNumber': { $exists: false } },
        { 'doctorProfile.licenseNumber': null },
        { 'doctorProfile.licenseNumber': '' },
      ],
    });

    console.log('\n=== Migration summary ===');
    console.log(`Doctors backfilled: ${doctorsMissingLicense.length}`);
    console.log(`Doctors still missing a license: ${remaining}`);
    if (doctorsMissingLicense.length > 0) {
      console.log(
        'NOTE: PENDING-* values are placeholders. Each affected doctor must replace it with their real license number on the Profile page.'
      );
    }
    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrate();
