import { useEffect, useState } from 'react';
import { fetchDoctorPublicProfile } from '../api/authService';

// Read-only modal that lets a patient (or doctor) verify a doctor's credentials —
// name, specialization, qualification, experience, bio, and medical license number —
// plus the clinics the doctor practices at.
function DoctorProfileModal({ doctorId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!doctorId) return undefined;
    let isCancelled = false;

    const loadProfile = async () => {
      // Defer the loading-state reset to a microtask so the effect body never
      // sets state synchronously (react-hooks/set-state-in-effect).
      await Promise.resolve();
      if (isCancelled) return;
      setIsLoading(true);
      setError('');
      setProfile(null);
      try {
        const data = await fetchDoctorPublicProfile(doctorId);
        if (!isCancelled) setProfile(data);
      } catch (err) {
        if (!isCancelled) setError(err.response?.data?.error || 'Unable to load doctor profile.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isCancelled = true;
    };
  }, [doctorId]);

  if (!doctorId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        className="surface w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-profile-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="eyebrow mb-1">Doctor profile</p>
            <h3 id="doctor-profile-title" className="text-2xl font-bold text-gray-900">
              {profile ? `Dr. ${profile.doctor.name}` : 'Doctor profile'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading doctor profile...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : profile ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold text-gray-700">Specialization</dt>
                <dd className="text-gray-600">{profile.doctor.specialization || '-'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Qualification</dt>
                <dd className="text-gray-600">{profile.doctor.qualification || '-'}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Experience</dt>
                <dd className="text-gray-600">
                  {profile.doctor.experienceYears != null ? `${profile.doctor.experienceYears} years` : '-'}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Medical license no.</dt>
                <dd className="text-gray-600 font-mono">{profile.doctor.licenseNumber}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-gray-700">Email</dt>
                <dd className="text-gray-600">{profile.doctor.email}</dd>
              </div>
            </dl>

            {profile.doctor.bio && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">About</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.doctor.bio}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Clinics</h4>
              {profile.clinics.length === 0 ? (
                <p className="text-sm text-gray-500">No clinics listed.</p>
              ) : (
                <ul className="space-y-2">
                  {profile.clinics.map((clinic) => (
                    <li key={clinic._id} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <p className="font-medium text-gray-900">
                        {clinic.name}
                        {clinic.status !== 'active' && (
                          <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                            Closed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{clinic.address}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DoctorProfileModal;
