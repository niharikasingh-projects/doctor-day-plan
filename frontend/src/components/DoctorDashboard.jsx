import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClinicManager from './ClinicManager';
import AppointmentList from './AppointmentList';
import { logout } from '../api/authService';

function DoctorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('clinics');
  const doctorName = localStorage.getItem('name');

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
          </nav>
          <button type="button" onClick={handleLogout} className="text-sm font-medium text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main>{activeTab === 'clinics' ? <ClinicManager /> : <AppointmentList role="doctor" />}</main>
    </div>
  );
}

export default DoctorDashboard;
