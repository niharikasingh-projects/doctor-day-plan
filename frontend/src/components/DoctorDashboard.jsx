import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClinicManager from './ClinicManager';
import AppointmentList from './AppointmentList';
import LiveQueue from './LiveQueue';
import PatientRecords from './PatientRecords';
import ProfilePanel from './ProfilePanel';
import { fetchDoctorClinics } from '../api/clinicService';
import { logout } from '../api/authService';
import { triggerDoctorEmergency } from '../api/appointmentService';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinics');
  const doctorName = localStorage.getItem('name');

  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [emergencyStatus, setEmergencyStatus] = useState('');
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState(
    'Doctor emergency: the doctor is unavailable today. Please reschedule your appointment.'
  );
  const [isSendingEmergency, setIsSendingEmergency] = useState(false);

  useEffect(() => {
    if (activeTab !== 'queue') return;

    const loadClinics = async () => {
      try {
        const data = await fetchDoctorClinics();
        setClinics(data);
        if (data.length > 0 && !selectedClinicId) {
          setSelectedClinicId(data[0]._id);
        }
      } catch {
        // Non-fatal — the clinic dropdown just stays empty.
      }
    };

    loadClinics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEmergency = async (event) => {
    event.preventDefault();
    if (!emergencyReason.trim()) return;
    setIsSendingEmergency(true);
    try {
      const result = await triggerDoctorEmergency(emergencyReason.trim());
      setEmergencyStatus(`${result.cancelledCount} appointment(s) cancelled and patients notified.`);
      setIsEmergencyDialogOpen(false);
    } catch (error) {
      setEmergencyStatus(error.response?.data?.error || 'Unable to send emergency notice.');
    } finally {
      setIsSendingEmergency(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header flex items-center justify-between gap-5">
        <div>
          <Link to="/" className="brand-mark text-lg font-bold no-underline">
            DoctorDayPlan
          </Link>
          <p className="text-xs text-gray-500 mt-1">Practice command center {doctorName && `· Dr. ${doctorName}`}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <nav className="tab-strip">
            <button
              type="button"
              onClick={() => setActiveTab('clinics')}
              aria-current={activeTab === 'clinics' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'clinics' ? 'is-active' : ''}`}
            >
              Clinics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              aria-current={activeTab === 'appointments' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'appointments' ? 'is-active' : ''}`}
            >
              Appointments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              aria-current={activeTab === 'queue' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'queue' ? 'is-active' : ''}`}
            >
              Live Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              aria-current={activeTab === 'records' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'records' ? 'is-active' : ''}`}
            >
              Patient Records
            </button>
            <button type="button" onClick={() => setActiveTab('profile')} aria-current={activeTab === 'profile' ? 'page' : undefined} className={`tab-button ${activeTab === 'profile' ? 'is-active' : ''}`}>
              Profile
            </button>
          </nav>
          <button type="button" onClick={handleLogout} className="text-sm font-bold text-red-600 hover:underline">
            Logout
          </button>
          <button type="button" onClick={() => setIsEmergencyDialogOpen(true)} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700">
            SOS
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {emergencyStatus && <p className="mx-auto mb-4 max-w-5xl rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{emergencyStatus}</p>}
        {activeTab === 'clinics' && <ClinicManager />}
        {activeTab === 'appointments' && <AppointmentList role="doctor" />}
        {activeTab === 'records' && <PatientRecords />}
        {activeTab === 'profile' && <ProfilePanel />}
        {activeTab === 'queue' && (
          <div className="p-6 max-w-2xl mx-auto space-y-4">
            <select
              value={selectedClinicId}
              onChange={(event) => setSelectedClinicId(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[280px]"
            >
              <option value="" disabled>
                Select a clinic
              </option>
              {clinics.map((clinic) => (
                <option key={clinic._id} value={clinic._id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <LiveQueue clinicId={selectedClinicId} role="doctor" />
          </div>
        )}
      </main>

      {isEmergencyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            className="surface w-full max-w-lg p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-dialog-title"
          >
            <p className="eyebrow text-red-700 mb-2">Emergency action</p>
            <h2 id="emergency-dialog-title" className="text-2xl font-bold text-gray-900 mb-2">
              Notify today&apos;s patients and cancel today&apos;s appointments?
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Only today&apos;s pending and confirmed appointments will be cancelled. Future appointments, completed appointments, rejected appointments, and already cancelled appointments will not change.
            </p>
            <form onSubmit={handleEmergency} className="space-y-4">
              <label htmlFor="emergencyReason" className="block text-sm font-medium text-gray-700">
                Message to affected patients
                <textarea
                  id="emergencyReason"
                  required
                  rows="4"
                  value={emergencyReason}
                  onChange={(event) => setEmergencyReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEmergencyDialogOpen(false)}
                  className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Keep appointments
                </button>
                <button type="submit" disabled={isSendingEmergency} className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50">
                  {isSendingEmergency ? 'Sending...' : 'Send SOS and cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorDashboard;
