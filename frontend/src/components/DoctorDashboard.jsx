import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">DoctorDayPlan — Doctor Dashboard</h1>
          {doctorName && <p className="text-sm text-gray-500">Dr. {doctorName}</p>}
        </div>
        <div className="flex items-center gap-4">
          <nav className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('clinics')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === 'clinics' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Clinics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === 'appointments' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Appointments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === 'queue' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Live Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                activeTab === 'records' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Patient Records
            </button>
          </nav>
          <button type="button" onClick={handleLogout} className="text-sm font-medium text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main>
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
