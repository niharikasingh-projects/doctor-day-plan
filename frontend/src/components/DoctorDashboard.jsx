import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClinicManager from './ClinicManager';
import AppointmentList from './AppointmentList';
import LiveQueue from './LiveQueue';
import PatientRecords from './PatientRecords';
import { fetchDoctorClinics } from '../api/clinicService';
import { logout } from '../api/authService';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinics');
  const doctorName = localStorage.getItem('name');

  const [clinics, setClinics] = useState([]);
  const [selectedClinicId, setSelectedClinicId] = useState('');

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
          </nav>
          <button type="button" onClick={handleLogout} className="text-sm font-bold text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {activeTab === 'clinics' && <ClinicManager />}
        {activeTab === 'appointments' && <AppointmentList role="doctor" />}
        {activeTab === 'records' && <PatientRecords />}
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
    </div>
  );
}

export default DoctorDashboard;
