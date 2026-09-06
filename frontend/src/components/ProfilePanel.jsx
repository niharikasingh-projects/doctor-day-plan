import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../api/authService';

function ProfilePanel() {
  const role = localStorage.getItem('role');
  const [profile, setProfile] = useState(null);
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

  const save = async (event) => {
    event.preventDefault();
    setStatus('');
    setIsError(false);

    if (form.phone && !/^\+?[0-9]{7,15}$/.test(form.phone.trim())) {
      setIsError(true);
      setStatus('Please enter a valid phone number (7-15 digits, optional leading +).');
      return;
    }
    if (role === 'doctor' && !/^[A-Za-z0-9\-/]{5,20}$/.test(form.licenseNumber.trim())) {
      setIsError(true);
      setStatus('Medical license number must be 5-20 characters (letters, digits, "-" or "/").');
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
            <input
              id="profileLicense"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              placeholder="e.g. MCI-12345"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
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
        <button className="primary-action w-fit" type="submit">Save profile</button>
        {status && <p className={`text-sm ${isError ? 'text-red-600' : 'text-green-700'}`}>{status}</p>}
      </form>
    </section>
  );
}

export default ProfilePanel;