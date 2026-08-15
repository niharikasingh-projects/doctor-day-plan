import { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../api/authService';

function ProfilePanel() {
  const role = localStorage.getItem('role');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: '', name: '', specialization: '', bio: '', qualification: '', defaultSlotDurationMins: 15, avgConsultationMins: 15 });
  const [status, setStatus] = useState('');

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
        defaultSlotDurationMins: details?.defaultSlotDurationMins || 15,
        avgConsultationMins: details?.avgConsultationMins || 15,
      });
    }).catch((error) => setStatus(error.response?.data?.error || 'Unable to load profile.'));
  }, [role]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = { phone: form.phone };
      payload[role === 'doctor' ? 'doctorProfile' : 'patientProfile'] = role === 'doctor'
        ? {
            name: form.name,
            specialization: form.specialization,
            bio: form.bio,
            qualification: form.qualification,
            defaultSlotDurationMins: Number(form.defaultSlotDurationMins),
            avgConsultationMins: Number(form.avgConsultationMins),
          }
        : { name: form.name, dob: profile?.patientProfile?.dob, gender: profile?.patientProfile?.gender };
      await updateProfile(payload);
      setStatus('Profile updated successfully.');
    } catch (error) {
      setStatus(error.response?.data?.error || 'Unable to update profile.');
    }
  };

  return (
    <section className="surface p-6 max-w-2xl">
      <p className="eyebrow mb-2">Account</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-5">My profile</h2>
      <form onSubmit={save} className="grid gap-4">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="rounded-lg border px-3 py-2" required />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-lg border px-3 py-2" />
        {role === 'doctor' && <>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Specialization" className="rounded-lg border px-3 py-2" />
          <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="Qualification" className="rounded-lg border px-3 py-2" />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-gray-600">Slot duration (minutes)
              <input type="number" min="5" value={form.defaultSlotDurationMins} onChange={(e) => setForm({ ...form, defaultSlotDurationMins: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="text-sm text-gray-600">Average consultation (minutes)
              <input type="number" min="5" value={form.avgConsultationMins} onChange={(e) => setForm({ ...form, avgConsultationMins: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Professional bio" className="rounded-lg border px-3 py-2" rows="3" />
        </>}
        <button className="primary-action w-fit" type="submit">Save profile</button>
        {status && <p className="text-sm text-gray-600">{status}</p>}
      </form>
    </section>
  );
}

export default ProfilePanel;