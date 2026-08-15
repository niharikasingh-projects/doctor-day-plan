import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from './Calendar';
import SlotSelector from './SlotSelector';
import AppointmentList from './AppointmentList';
import { fetchAvailableSlots, fetchAllClinics, fetchMonthlyAvailability } from '../api/clinicService';
import { bookAppointment } from '../api/appointmentService';
import { logout } from '../api/authService';

const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

function PatientDashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const patientName = localStorage.getItem('name');

  const [clinics, setClinics] = useState([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [selectedClinicId, setSelectedClinicId] = useState('');

  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClinicChange = (event) => {
    setSelectedClinicId(event.target.value);
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot('');
  };

  const changeMonth = (delta) => {
    setSelectedDate('');
    setSlots([]);
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
    setStatus('');
    setIsLoadingSlots(true);
    try {
      const data = await fetchAvailableSlots(selectedClinicId, dateKey);
      setSlots(data.slots || []);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">DoctorDayPlan — Patient Dashboard</h1>
          {patientName && <p className="text-sm text-gray-500">{patientName}</p>}
        </div>
        <button type="button" onClick={handleLogout} className="text-sm font-medium text-red-600 hover:underline">
          Logout
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-8">
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Book an Appointment</h2>

          <div className="mb-4">
            <label htmlFor="clinicSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Clinic
            </label>
            <select
              id="clinicSelect"
              value={selectedClinicId}
              onChange={handleClinicChange}
              disabled={isLoadingClinics}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-[280px]"
            >
              <option value="" disabled>
                {isLoadingClinics ? 'Loading clinics...' : 'Select a clinic'}
              </option>
              {clinics.map((clinic) => (
                <option key={clinic._id} value={clinic._id}>
                  {clinic.name} — {clinic.address}
                  {clinic.doctorId?.doctorProfile?.name ? ` (Dr. ${clinic.doctorId.doctorProfile.name})` : ''}
                </option>
              ))}
            </select>
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
                    <SlotSelector slots={slots} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />

                    {selectedSlot && (
                      <button
                        type="button"
                        onClick={handleBook}
                        className="mt-4 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
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
        </section>

        <AppointmentList key={refreshKey} role="patient" onRefresh={() => setRefreshKey((prev) => prev + 1)} />
      </main>
    </div>
  );
}

export default PatientDashboard;
