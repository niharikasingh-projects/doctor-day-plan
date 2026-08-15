import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from './Calendar';
import SlotSelector from './SlotSelector';
import AppointmentList from './AppointmentList';
import LiveQueue from './LiveQueue';
import MedicalHistory from './MedicalHistory';
import ProfilePanel from './ProfilePanel';
import { fetchAvailableSlots, fetchAllClinics, fetchMonthlyAvailability } from '../api/clinicService';
import { bookAppointment, fetchMyAppointments } from '../api/appointmentService';
import { logout } from '../api/authService';
import { useQueueContext } from '../context/QueueContext';

const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;
const INDIAN_CITIES = [
  'Ahmedabad',
  'Amritsar',
  'Bengaluru',
  'Bhopal',
  'Bhubaneswar',
  'Chandigarh',
  'Chennai',
  'Coimbatore',
  'Dehradun',
  'Delhi',
  'Gurugram',
  'Guwahati',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Jammu',
  'Kanpur',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Ludhiana',
  'Mumbai',
  'Mysuru',
  'Nagpur',
  'Nashik',
  'Noida',
  'Patna',
  'Pune',
  'Rajkot',
  'Ranchi',
  'Surat',
  'Thiruvananthapuram',
  'Vadodara',
  'Varanasi',
  'Vijayawada',
  'Visakhapatnam',
];

function PatientDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const patientName = localStorage.getItem('name');
  const [activeTab, setActiveTab] = useState('booking');

  const [clinics, setClinics] = useState([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');

  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [disabledSlots, setDisabledSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeQueueAppointment, setActiveQueueAppointment] = useState(null);
  const { emergencyNotice, setEmergencyNotice } = useQueueContext();

  useEffect(() => {
    const loadActiveAppointment = async () => {
      try {
        const data = await fetchMyAppointments();
        const checkedInToday = data.find(
          (appt) =>
            appt.checkedInAt &&
            appt.status === 'confirmed' &&
            new Date(appt.appointmentDate).toDateString() === new Date().toDateString()
        );
        setActiveQueueAppointment(checkedInToday || null);
      } catch {
        setActiveQueueAppointment(null);
      }
    };

    loadActiveAppointment();
  }, [refreshKey]);

  useEffect(() => {
    const loadClinics = async () => {
      setIsLoadingClinics(true);
      try {
        const data = await fetchAllClinics();
        setClinics(data);
      } catch (err) {
        setStatus(err.response?.data?.error || 'Unable to load clinics.');
      } finally {
        setIsLoadingClinics(false);
      }
    };

    loadClinics();
  }, []);

  useEffect(() => {
    if (!selectedClinicId) {
      setAvailability({});
      return;
    }

    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const data = await fetchMonthlyAvailability(selectedClinicId, monthKey(calendarYear, calendarMonth));
        setAvailability(data.availability || {});
      } catch (err) {
        setStatus(err.response?.data?.error || 'Unable to load calendar availability.');
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedClinicId, calendarYear, calendarMonth]);

  useEffect(() => {
    if (!selectedClinicId || !selectedDate || refreshKey === 0) return;

    const refreshSlots = async () => {
      try {
        const data = await fetchAvailableSlots(selectedClinicId, selectedDate);
        setSlots(data.allSlots || data.slots || []);
        setDisabledSlots(data.disabledSlots || data.bookedSlots || []);
      } catch (err) {
        setStatus(err.response?.data?.error || 'Unable to refresh slot availability.');
      }
    };

    refreshSlots();
  }, [refreshKey, selectedClinicId, selectedDate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClinicChange = (event) => {
    setSelectedClinicId(event.target.value);
    setSelectedDate('');
    setSlots([]);
    setDisabledSlots([]);
    setSelectedSlot('');
  };

  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
    setSelectedClinicId('');
    setSelectedDate('');
    setSlots([]);
    setDisabledSlots([]);
    setSelectedSlot('');
  };

  const clinicsInSelectedCity = clinics.filter((clinic) =>
    selectedCity ? clinic.address.toLowerCase().includes(selectedCity.toLowerCase()) : false
  );

  const changeMonth = (delta) => {
    setSelectedDate('');
    setSlots([]);
    setDisabledSlots([]);
    setSelectedSlot('');
    setCalendarMonth((prevMonth) => {
      let nextMonth = prevMonth + delta;
      let nextYear = calendarYear;
      if (nextMonth < 0) {
        nextMonth = 11;
        nextYear -= 1;
      } else if (nextMonth > 11) {
        nextMonth = 0;
        nextYear += 1;
      }
      setCalendarYear(nextYear);
      return nextMonth;
    });
  };

  const handleSelectDate = async (dateKey) => {
    setSelectedDate(dateKey);
    setSelectedSlot('');
    setDisabledSlots([]);
    setStatus('');
    setIsLoadingSlots(true);
    try {
      const data = await fetchAvailableSlots(selectedClinicId, dateKey);
      setSlots(data.allSlots || data.slots || []);
      setDisabledSlots(data.disabledSlots || data.bookedSlots || []);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Unable to fetch slots.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    const clinic = clinics.find((item) => item._id === selectedClinicId);
    if (!clinic) return;

    try {
      await bookAppointment({
        clinicId: clinic._id,
        doctorId: clinic.doctorId?._id,
        appointmentDate: selectedDate,
        slotTime: selectedSlot,
      });
      setStatus('Appointment requested successfully.');
      setSelectedSlot('');
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setStatus(err.response?.data?.error || 'Unable to book appointment.');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header flex items-center justify-between gap-5">
        <div>
          <Link to="/" className="brand-mark text-lg font-bold no-underline">
            DoctorDayPlan
          </Link>
          <p className="text-xs text-gray-500 mt-1">Your care journey {patientName && `· ${patientName}`}</p>
        </div>
        <div className="flex items-center gap-3">
          <nav className="tab-strip">
            <button
              type="button"
              onClick={() => setActiveTab('booking')}
              aria-current={activeTab === 'booking' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'booking' ? 'is-active' : ''}`}
            >
              Book Appointment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              aria-current={activeTab === 'bookings' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'bookings' ? 'is-active' : ''}`}
            >
              My Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              aria-current={activeTab === 'history' ? 'page' : undefined}
              className={`tab-button ${activeTab === 'history' ? 'is-active' : ''}`}
            >
              My Medical History
            </button>
            <button type="button" onClick={() => setActiveTab('profile')} aria-current={activeTab === 'profile' ? 'page' : undefined} className={`tab-button ${activeTab === 'profile' ? 'is-active' : ''}`}>
              Profile
            </button>
          </nav>
          <button type="button" onClick={handleLogout} className="text-sm font-bold text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main space-y-8">
        {emergencyNotice && (
          <div className="surface border-l-4 border-red-500 p-5" role="alert">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-red-700 mb-1">Urgent appointment update</p>
                <p className="font-semibold text-gray-900">Your doctor is unavailable.</p>
                <p className="text-sm text-gray-600 mt-1">{emergencyNotice}</p>
                <p className="text-sm text-gray-600 mt-1">Please choose another available slot from Book Appointment.</p>
              </div>
              <button type="button" onClick={() => setEmergencyNotice('')} className="text-sm font-bold text-gray-500 hover:text-gray-900">Dismiss</button>
            </div>
          </div>
        )}
        {activeTab === 'booking' && <section className="surface p-6 md:p-8">
          <p className="eyebrow mb-2">Find your next visit</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Book an appointment</h2>
          <p className="text-sm text-gray-500 mb-6">Choose a city, clinic, and date to see live availability.</p>

          <div className="booking-fields mb-6">
            <div className="field-group">
              <label htmlFor="citySelect" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                id="citySelect"
                required
                value={selectedCity}
                onChange={handleCityChange}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[220px]"
              >
                <option value="" disabled>
                  Select a city
                </option>
                {INDIAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="clinicSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Clinic
              </label>
              <select
                id="clinicSelect"
                required
                value={selectedClinicId}
                onChange={handleClinicChange}
                disabled={!selectedCity || isLoadingClinics}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[280px]"
              >
                <option value="" disabled>
                  {!selectedCity
                    ? 'Select a city first'
                    : isLoadingClinics
                      ? 'Loading clinics...'
                      : clinicsInSelectedCity.length === 0
                        ? 'No clinics in this city'
                        : 'Select a clinic'}
                </option>
                {clinicsInSelectedCity.map((clinic) => (
                  <option key={clinic._id} value={clinic._id}>
                    {clinic.name} — {clinic.address}
                    {clinic.doctorId?.doctorProfile?.name ? ` (Dr. ${clinic.doctorId.doctorProfile.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedClinicId && (
            <div className="flex flex-wrap gap-6 items-start">
              <Calendar
                year={calendarYear}
                month={calendarMonth}
                availability={availability}
                isLoading={isLoadingAvailability}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
                onPrevMonth={() => changeMonth(-1)}
                onNextMonth={() => changeMonth(1)}
              />

              <div className="flex-1 min-w-[240px]">
                {!selectedDate ? (
                  <p className="text-sm text-gray-500">Pick a highlighted date to see available slots.</p>
                ) : isLoadingSlots ? (
                  <p className="text-sm text-gray-500">Loading slots...</p>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Slots on {new Date(selectedDate).toLocaleDateString()}
                    </h3>
                    <SlotSelector
                      slots={slots}
                      disabledSlots={disabledSlots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                    />

                    {selectedSlot && (
                        <button
                        type="button"
                        onClick={handleBook}
                          className="primary-action mt-4"
                      >
                        Book {selectedSlot}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {status && <p className="text-sm text-gray-600 mt-3">{status}</p>}
        </section>}

        {activeTab === 'booking' && activeQueueAppointment && (
          <LiveQueue
            clinicId={activeQueueAppointment.clinicId?._id || activeQueueAppointment.clinicId}
            role="patient"
            avgConsultationMins={activeQueueAppointment.doctorId?.doctorProfile?.avgConsultationMins || 15}
            myAppointmentId={activeQueueAppointment._id}
          />
        )}

        {activeTab === 'bookings' && (
          <AppointmentList key={refreshKey} role="patient" onRefresh={() => setRefreshKey((prev) => prev + 1)} />
        )}
        {activeTab === 'history' && (
          <MedicalHistory patientId={localStorage.getItem('userId')} title="My Medical History" />
        )}
        {activeTab === 'profile' && <ProfilePanel />}
      </main>
    </div>
  );
}

export default PatientDashboard;
