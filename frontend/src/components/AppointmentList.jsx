import { useEffect, useState } from 'react';
import {
  fetchUpcomingAppointments,
  fetchMyAppointments,
  updateAppointmentStatus,
  checkInAppointment,
} from '../api/appointmentService';
import ConsultationWorkspace from './ConsultationWorkspace';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const isToday = (dateValue) => new Date(dateValue).toDateString() === new Date().toDateString();

function AppointmentList({ role, onRefresh }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [consultationAppointment, setConsultationAppointment] = useState(null);
  const [collapsedDates, setCollapsedDates] = useState({});

  const loadAppointments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = role === 'doctor' ? await fetchUpcomingAppointments() : await fetchMyAppointments();
      setAppointments(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const refresh = () => {
    loadAppointments();
    if (onRefresh) onRefresh();
  };

  const handleStatusUpdate = async (id, status, cancelReason) => {
    try {
      await updateAppointmentStatus(id, status, cancelReason);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update appointment status.');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      await checkInAppointment(id);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to check in.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {role === 'doctor' ? 'Upcoming Appointments' : 'My Bookings'}
      </h2>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">No appointments found.</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment, index) => {
            const appointmentDateKey = new Date(appointment.appointmentDate).toISOString().slice(0, 10);
            const previousDateKey = index > 0
              ? new Date(appointments[index - 1].appointmentDate).toISOString().slice(0, 10)
              : null;
            const isNewDate = appointmentDateKey !== previousDateKey;
            const isCollapsed = collapsedDates[appointmentDateKey] === true;
            const appointmentCount = isNewDate
              ? appointments.filter(
                  (item) => new Date(item.appointmentDate).toISOString().slice(0, 10) === appointmentDateKey
                ).length
              : 0;

            return (
              <div key={appointment._id}>
                {isNewDate && (
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsedDates((previous) => ({
                        ...previous,
                        [appointmentDateKey]: !isCollapsed,
                      }))
                    }
                    className="date-group-toggle"
                  >
                    <span className={`date-group-chevron ${isCollapsed ? 'is-collapsed' : ''}`} aria-hidden="true" />
                    <span>
                      {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="date-group-count">
                      {appointmentCount} {appointmentCount === 1 ? 'appointment' : 'appointments'}
                    </span>
                  </button>
                )}
                <div className={isCollapsed ? 'hidden' : 'bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-3'}>
              <div>
                <p className="font-medium text-gray-900">
                  {role === 'doctor'
                    ? appointment.patientId?.patientProfile?.name || appointment.patientId?.email
                    : appointment.clinicId?.name || 'Clinic'}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.slotTime}
                </p>
                {role === 'patient' && appointment.doctorId?.doctorProfile?.name && (
                  <p className="text-xs text-gray-400">Dr. {appointment.doctorId.doctorProfile.name}</p>
                )}
                {appointment.checkedInAt && (
                  <p className="text-xs text-gray-400">
                    Checked in at {new Date(appointment.checkedInAt).toLocaleTimeString()}
                  </p>
                )}
                {appointment.cancelReason && (
                  <p className="text-xs text-gray-400">Reason: {appointment.cancelReason}</p>
                )}
              </div>

              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[appointment.status] || 'bg-gray-100 text-gray-600'}`}
              >
                {appointment.status}
              </span>

              <div className="flex gap-2">
                {role === 'doctor' && appointment.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(appointment._id, 'confirmed')}
                      className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(appointment._id, 'rejected')}
                      className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                )}

                {role === 'doctor' && appointment.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => setConsultationAppointment(appointment)}
                    className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                  >
                    Complete Consultation
                  </button>
                )}

                {role === 'patient' &&
                  ['pending', 'confirmed'].includes(appointment.status) &&
                  isToday(appointment.appointmentDate) &&
                  !appointment.checkedInAt && (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(appointment._id)}
                      className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                    >
                      Check-In
                    </button>
                  )}

                {role === 'patient' && ['pending', 'confirmed'].includes(appointment.status) && (
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('Reason for cancellation:');
                      if (reason) handleStatusUpdate(appointment._id, 'cancelled', reason);
                    }}
                    className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {consultationAppointment && (
        <ConsultationWorkspace
          appointment={consultationAppointment}
          onClose={() => setConsultationAppointment(null)}
          onCompleted={refresh}
        />
      )}
    </div>
  );
}

export default AppointmentList;
