import { useEffect, useState } from 'react';
import { getProfile, updateProfile, verifyLicenseNumber } from '../api/authService';

const LICENSE_FORMAT_REGEX = /^(?=.{5,10}$)[A-Za-z]{2,5}-[0-9]{2,7}$/;

function ProfilePanel() {
  const role = localStorage.getItem('role');
  const [profile, setProfile] = useState(null);
  const [originalLicenseNumber, setOriginalLicenseNumber] = useState('');
  // Tracks the licensing-authority check: 'idle' | 'checking' | 'valid' | 'invalid'.
  const [licenseCheck, setLicenseCheck] = useState({ status: 'idle', message: '', checkedValue: '' });
  const [form, setForm] = useState({
    phone: '',
    name: '',
    specialization: '',
    bio: '',
    qualification: '',
    licenseNumber: '',
    experienceYears: '',
    defaultSlotDurationMins: 15,
    avgConsultationMins: 15,
    dob: '',
    gender: 'Female',
  });
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    getProfile().then((user) => {
      const details = role === 'doctor' ? user.doctorProfile : user.patientProfile;
      setProfile(user);
      setOriginalLicenseNumber(details?.licenseNumber || '');
      setForm({
        phone: user.phone || '',
        name: details?.name || '',
        specialization: details?.specialization || '',
        bio: details?.bio || '',
        qualification: details?.qualification || '',
        licenseNumber: details?.licenseNumber || '',
        experienceYears: details?.experienceYears ?? '',
        defaultSlotDurationMins: details?.defaultSlotDurationMins || 15,
        avgConsultationMins: details?.avgConsultationMins || 15,
        dob: details?.dob ? new Date(details.dob).toISOString().slice(0, 10) : '',
        gender: details?.gender || 'Female',
      });
    }).catch((error) => {
      setIsError(true);
      setStatus(error.response?.data?.error || 'Unable to load profile.');
    });
  }, [role]);

  // A license number that hasn't changed from the saved value is already
  // verified; only a new value needs a fresh licensing-authority check.
  const licenseChanged = form.licenseNumber.trim() !== originalLicenseNumber;
  const isLicenseVerified =
    !licenseChanged ||
    (licenseCheck.status === 'valid' && licenseCheck.checkedValue === form.licenseNumber.trim());

  const handleVerifyLicense = async () => {
    const candidate = form.licenseNumber.trim();
    if (!LICENSE_FORMAT_REGEX.test(candidate)) {
      setLicenseCheck({
        status: 'invalid',
        message: 'License number must match the format MCI-12345 (letters, "-", digits; max 10 characters) before it can be verified.',
        checkedValue: candidate,
      });
      return;
    }

    setLicenseCheck({ status: 'checking', message: '', checkedValue: candidate });
    try {
      const result = await verifyLicenseNumber(candidate);
      setLicenseCheck({
        status: result.valid ? 'valid' : 'invalid',
        message: result.message,
        checkedValue: candidate,
      });
    } catch (err) {
      setLicenseCheck({
        status: 'invalid',
        message: err.response?.data?.error || 'Unable to verify the license number. Please try again.',
        checkedValue: candidate,
      });
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setStatus('');
    setIsError(false);

    if (form.phone && !/^\+?[0-9]{7,15}$/.test(form.phone.trim())) {
      setIsError(true);
      setStatus('Please enter a valid phone number (7-15 digits, optional leading +).');
      return;
    }
    if (role === 'doctor' && !LICENSE_FORMAT_REGEX.test(form.licenseNumber.trim())) {
      setIsError(true);
      setStatus('Medical license number must match the format MCI-12345 (letters, "-", digits; max 10 characters).');
      return;
    }
    if (role === 'doctor' && !isLicenseVerified) {
      setIsError(true);
      setStatus('Please verify the new medical license number with the licensing authority before saving.');
      return;
    }

    try {
      const payload = { phone: form.phone.trim() };
      payload[role === 'doctor' ? 'doctorProfile' : 'patientProfile'] = role === 'doctor'
        ? {
            name: form.name.trim(),
            specialization: form.specialization.trim(),
            bio: form.bio,
            qualification: form.qualification.trim(),
            licenseNumber: form.licenseNumber.trim(),
            experienceYears: form.experienceYears === '' ? undefined : Number(form.experienceYears),
            defaultSlotDurationMins: Number(form.defaultSlotDurationMins),
            avgConsultationMins: Number(form.avgConsultationMins),
          }
        : { name: form.name.trim(), dob: form.dob || profile?.patientProfile?.dob, gender: form.gender };
      await updateProfile(payload);
      setStatus('Profile updated successfully.');
      if (role === 'doctor') setOriginalLicenseNumber(form.licenseNumber.trim());
    } catch (error) {
      setIsError(true);
      setStatus(error.response?.data?.error || 'Unable to update profile.');
    }
  };

  return (
    <section className="surface p-4 sm:p-6 max-w-2xl">
      <p className="eyebrow mb-2">Account</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-5">My profile</h2>
      <form onSubmit={save} className="grid gap-4">
        <div>
          <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="profileEmail"
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
        </div>

        <div>
          <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-1">
            Full name
          </label>
          <input
            id="profileName"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Priya Sharma"
            className="w-full rounded-lg border px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="profilePhone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="profilePhone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. +919876543210"
            className="w-full rounded-lg border px-3 py-2"
            required={role === 'patient'}
          />
        </div>

        {role === 'patient' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profileDob" className="block text-sm font-medium text-gray-700 mb-1">
                Date of birth
              </label>
              <input
                id="profileDob"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="profileGender" className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                id="profileGender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}

        {role === 'doctor' && <>
          <div>
            <label htmlFor="profileLicense" className="block text-sm font-medium text-gray-700 mb-1">
              Medical license number <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="profileLicense"
                value={form.licenseNumber}
                onChange={(e) => {
                  setForm({ ...form, licenseNumber: e.target.value });
                  setLicenseCheck({ status: 'idle', message: '', checkedValue: '' });
                }}
                placeholder="e.g. MCI-12345"
                aria-describedby="profileLicenseHint"
                className="w-full rounded-lg border px-3 py-2"
                required
              />
              <button
                type="button"
                onClick={handleVerifyLicense}
                disabled={licenseCheck.status === 'checking' || !form.licenseNumber.trim() || !licenseChanged}
                className="shrink-0 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {licenseCheck.status === 'checking' ? 'Verifying...' : 'Verify License'}
              </button>
            </div>
            <p id="profileLicenseHint" className="text-xs text-gray-400 mt-1">
              Format: MCI-12345 (letters, "-", digits; max 10 characters). Changing this number requires re-verification before saving.
            </p>
            {!licenseChanged && (
              <p className="text-xs text-gray-400 mt-1">Current license number is already verified.</p>
            )}
            {licenseChanged && licenseCheck.status === 'valid' && licenseCheck.checkedValue === form.licenseNumber.trim() && (
              <p className="text-xs text-green-700 mt-1">✓ {licenseCheck.message}</p>
            )}
            {licenseChanged && licenseCheck.status === 'invalid' && licenseCheck.checkedValue === form.licenseNumber.trim() && (
              <p className="text-xs text-red-600 mt-1">✗ {licenseCheck.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="profileSpecialization" className="block text-sm font-medium text-gray-700 mb-1">
              Specialization
            </label>
            <input
              id="profileSpecialization"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="e.g. Cardiology"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="profileQualification" className="block text-sm font-medium text-gray-700 mb-1">
              Qualification
            </label>
            <input
              id="profileQualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="e.g. MBBS, MD"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="profileExperience" className="block text-sm font-medium text-gray-700 mb-1">
              Experience (years)
            </label>
            <input
              id="profileExperience"
              type="number"
              min="0"
              max="70"
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
              placeholder="e.g. 10"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="profileSlotDuration" className="text-sm font-medium text-gray-700">
              Slot duration (minutes)
              <input
                id="profileSlotDuration"
                type="number"
                min="5"
                max="120"
                value={form.defaultSlotDurationMins}
                onChange={(e) => setForm({ ...form, defaultSlotDurationMins: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label htmlFor="profileAvgConsultation" className="text-sm font-medium text-gray-700">
              Average consultation (minutes)
              <input
                id="profileAvgConsultation"
                type="number"
                min="5"
                max="120"
                value={form.avgConsultationMins}
                onChange={(e) => setForm({ ...form, avgConsultationMins: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>
          <div>
            <label htmlFor="profileBio" className="block text-sm font-medium text-gray-700 mb-1">
              Professional bio
            </label>
            <textarea
              id="profileBio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="e.g. Senior cardiologist focused on preventive heart care."
              className="w-full rounded-lg border px-3 py-2"
              rows="3"
            />
          </div>
        </>}
        <button className="primary-action w-fit disabled:opacity-50" type="submit" disabled={role === 'doctor' && !isLicenseVerified}>Save profile</button>
        {status && <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-700'}`}>{status}</p>}
      </form>
    </section>
  );
}

export default ProfilePanel;