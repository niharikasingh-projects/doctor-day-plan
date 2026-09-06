import { useEffect, useState } from 'react';
import {
  fetchUpcomingAppointments,
  fetchMyAppointments,
  updateAppointmentStatus,
  checkInAppointment,
  rescheduleAppointment,
} from '../api/appointmentService';
import ConsultationWorkspace from './ConsultationWorkspace';
import Pagination from './Pagination';
import DoctorProfileModal from './DoctorProfileModal';
import { exportToExcel, appointmentToRow } from '../utils/exportExcel';

const PAGE_SIZE = 10;

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const isToday = (dateValue) => new Date(dateValue).toDateString() === new Date().toDateString();

const dateKeyOf = (dateValue) => new Date(dateValue).toISOString().slice(0, 10);

const formatGroupDate = (dateValue) =>
  new Date(dateValue).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

// Groups appointments by date (in the order received — the API pre-sorts by
// date then slot), and within each date groups by clinic.
const groupByDateThenClinic = (appointments) => {
  const dateMap = new Map();
  appointments.forEach((appointment) => {
    const dateKey = dateKeyOf(appointment.appointmentDate);
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Map());
    const clinicMap = dateMap.get(dateKey);
    const clinicKey = appointment.clinicId?._id || appointment.clinicId || 'unknown-clinic';
    if (!clinicMap.has(clinicKey)) clinicMap.set(clinicKey, []);
    clinicMap.get(clinicKey).push(appointment);
  });
  return [...dateMap.entries()].map(([dateKey, clinicMap]) => ({
    dateKey,
    appointmentCount: [...clinicMap.values()].reduce((sum, list) => sum + list.length, 0),
    clinicGroups: [...clinicMap.entries()].map(([clinicKey, items]) => ({
      clinicKey,
      clinicName: items[0]?.clinicId?.name || 'Clinic',
      items,
    })),
  }));
};

// Single appointment card with all role-specific actions.
function AppointmentCard({
  appointment,
  role,
  onStatusUpdate,
  onCheckIn,
  onReschedule,
  onStartConsultation,
  onViewDoctorProfile,
  onCancel,
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-3">
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
          <button
            type="button"
            onClick={() => onViewDoctorProfile(appointment.doctorId._id)}
            className="text-xs text-blue-600 hover:underline text-left"
          >
            Dr. {appointment.doctorId.doctorProfile.name}
            {appointment.doctorId.doctorProfile.specialization
              ? ` · ${appointment.doctorId.doctorProfile.specialization}`
              : ''}
          </button>
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
              onClick={() => onStatusUpdate(appointment._id, 'confirmed')}
              className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onStatusUpdate(appointment._id, 'rejected')}
              className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-red-700"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onReschedule(appointment)}
              className="rounded-lg border border-blue-200 text-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-50"
            >
              Reschedule
            </button>
          </>
        )}

        {role === 'doctor' && appointment.status === 'confirmed' && (
          <button
            type="button"
            onClick={() => onStartConsultation(appointment)}
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
              onClick={() => onCheckIn(appointment._id)}
              className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
            >
              Check-In
            </button>
          )}

        {role === 'patient' && ['pending', 'confirmed'].includes(appointment.status) && (
          <button
            type="button"
            onClick={() => onCancel(appointment)}
            className="rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// Cancellation reason dialog — replaces the native window.prompt with a
// responsive, accessible modal containing a labeled textarea.
function CancelAppointmentDialog({ appointment, onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!reason.trim()) return;
    onConfirm(appointment._id, 'cancelled', reason.trim());
  };

  if (!appointment) return null;

  const clinicLabel = appointment.clinicId?.name || 'this clinic';
  const dateLabel = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div
        className="surface w-full max-w-md p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-appointment-title"
      >
        <p className="eyebrow text-red-700 mb-2">Cancellation</p>
        <h3 id="cancel-appointment-title" className="text-2xl font-bold text-gray-900 mb-1">
          Cancel this appointment?
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          {clinicLabel} · {dateLabel} at {appointment.slotTime}. The slot will be released for other
          patients and the clinic will be notified.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700">
            Reason for cancellation <span className="text-red-500">*</span>
            <textarea
              id="cancelReason"
              required
              rows="4"
              autoFocus
              placeholder="e.g. I have a scheduling conflict and need a different day"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
            >
              Keep appointment
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Doctor view: today's bookings pinned to the top in a highlighted panel,
// followed by every upcoming date — each date subgrouped by clinic.
function DoctorGroupedAppointments({ appointments, collapsedDates, setCollapsedDates, cardProps }) {
  const todaysAppointments = appointments.filter((appointment) => isToday(appointment.appointmentDate));
  const futureAppointments = appointments.filter((appointment) => !isToday(appointment.appointmentDate));

  const renderClinicGroup = ({ clinicKey, clinicName, items }) => (
    <div key={clinicKey} className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
        {clinicName}
        <span className="ml-2 font-medium normal-case text-gray-400">
          {items.length} {items.length === 1 ? 'booking' : 'bookings'}
        </span>
      </p>
      {items.map((appointment) => (
        <AppointmentCard key={appointment._id} appointment={appointment} {...cardProps} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {todaysAppointments.length > 0 && (
        <section className="today-panel">
          <h3 className="text-sm font-bold text-teal-900 mb-1">Today&apos;s Bookings</h3>
          <p className="text-xs text-teal-800 mb-3">
            {formatGroupDate(new Date())} · {todaysAppointments.length}{' '}
            {todaysAppointments.length === 1 ? 'appointment' : 'appointments'}
          </p>
          <div className="space-y-4">
            {groupByDateThenClinic(todaysAppointments).flatMap((dateGroup) =>
              dateGroup.clinicGroups.map(renderClinicGroup)
            )}
          </div>
        </section>
      )}

      {futureAppointments.length > 0 && (
        <div className="space-y-3">
          {todaysAppointments.length > 0 && (
            <h3 className="text-sm font-bold text-gray-700 pt-2">Later dates</h3>
          )}
          {groupByDateThenClinic(futureAppointments).map((dateGroup) => {
            const isCollapsed = collapsedDates[dateGroup.dateKey] === true;
            return (
              <div key={dateGroup.dateKey}>
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsedDates((previous) => ({
                      ...previous,
                      [dateGroup.dateKey]: !isCollapsed,
                    }))
                  }
                  className="date-group-toggle"
                >
                  <span className={`date-group-chevron ${isCollapsed ? 'is-collapsed' : ''}`} aria-hidden="true" />
                  <span>
                    {new Date(`${dateGroup.dateKey}T00:00:00`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="date-group-count">
                    {dateGroup.appointmentCount} {dateGroup.appointmentCount === 1 ? 'appointment' : 'appointments'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-4 mt-2">
                    {dateGroup.clinicGroups.map(renderClinicGroup)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Patient view: today's bookings pinned to the top in a highlighted panel
// (grouped by clinic, same as the doctor view), followed by all other dates
// with collapsible date headers.
function PatientGroupedAppointments({ appointments, collapsedDates, setCollapsedDates, cardProps }) {
  const todaysAppointments = appointments.filter((appointment) => isToday(appointment.appointmentDate));
  const otherAppointments = appointments.filter((appointment) => !isToday(appointment.appointmentDate));

  const renderCard = (appointment) => (
    <AppointmentCard key={appointment._id} appointment={appointment} {...cardProps} />
  );

  return (
    <div className="space-y-6">
      {todaysAppointments.length > 0 && (
        <section className="today-panel">
          <h3 className="text-sm font-bold text-teal-900 mb-1">Today&apos;s Bookings</h3>
          <p className="text-xs text-teal-800 mb-3">
            {formatGroupDate(new Date())} · {todaysAppointments.length}{' '}
            {todaysAppointments.length === 1 ? 'appointment' : 'appointments'}
          </p>
          <div className="space-y-4">
            {groupByDateThenClinic(todaysAppointments).flatMap((dateGroup) =>
              dateGroup.clinicGroups.map(({ clinicKey, clinicName, items }) => (
                <div key={clinicKey} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    {clinicName}
                    <span className="ml-2 font-medium normal-case text-gray-400">
                      {items.length} {items.length === 1 ? 'booking' : 'bookings'}
                    </span>
                  </p>
                  {items.map(renderCard)}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {otherAppointments.length > 0 && (
        <div className="space-y-3">
          {todaysAppointments.length > 0 && (
            <h3 className="text-sm font-bold text-gray-700 pt-2">Other dates</h3>
          )}
          {groupByDateThenClinic(otherAppointments).map((dateGroup) => {
            const isCollapsed = collapsedDates[dateGroup.dateKey] === true;
            return (
              <div key={dateGroup.dateKey}>
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsedDates((previous) => ({
                      ...previous,
                      [dateGroup.dateKey]: !isCollapsed,
                    }))
                  }
                  className="date-group-toggle"
                >
                  <span className={`date-group-chevron ${isCollapsed ? 'is-collapsed' : ''}`} aria-hidden="true" />
                  <span>
                    {new Date(`${dateGroup.dateKey}T00:00:00`).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="date-group-count">
                    {dateGroup.appointmentCount} {dateGroup.appointmentCount === 1 ? 'appointment' : 'appointments'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2 mt-2">
                    {dateGroup.clinicGroups.flatMap((clinicGroup) => clinicGroup.items.map(renderCard))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentList({ role, onRefresh }) {
  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [consultationAppointment, setConsultationAppointment] = useState(null);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', slotTime: '' });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [profileDoctorId, setProfileDoctorId] = useState('');

  // All setState calls happen after the first await — no synchronous state
  // updates inside the effect that mounts/re-runs this loader.
  const loadAppointments = async (pageToLoad = page) => {
    try {
      const result =
        role === 'doctor'
          ? await fetchUpcomingAppointments({ page: pageToLoad, limit: PAGE_SIZE })
          : await fetchMyAppointments({ page: pageToLoad, limit: PAGE_SIZE });
      setAppointments(result.data || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Effect-local wrapper: loadAppointments only sets state after awaits, but
    // the linter only traces effect-local functions (matches the pattern used
    // in the dashboard components).
    const load = async () => {
      await loadAppointments(page);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, page]);

  const handlePageChange = (nextPage) => {
    setIsLoading(true);
    setError('');
    setPage(nextPage);
  };

  const refresh = () => {
    setIsLoading(true);
    setError('');
    loadAppointments(page);
    if (onRefresh) onRefresh();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      const result = await fetchUpcomingAppointments({ all: true });
      const rows = (result.data || []).map(appointmentToRow);
      exportToExcel(rows, `appointments-${new Date().toISOString().slice(0, 10)}`, 'Appointments');
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Unable to export appointments.');
    } finally {
      setIsExporting(false);
    }
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

  const handleReschedule = async (appointment) => {
    setReschedulingAppointment(appointment);
    setRescheduleForm({
      appointmentDate: new Date(appointment.appointmentDate).toISOString().slice(0, 10),
      slotTime: appointment.slotTime,
    });
  };

  const handleCancelConfirm = async (id, status, reason) => {
    setIsCancelling(true);
    try {
      await updateAppointmentStatus(id, status, reason);
      setCancellingAppointment(null);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to cancel the appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const submitReschedule = async (event) => {
    event.preventDefault();
    if (!reschedulingAppointment) return;
    setIsRescheduling(true);
    try {
      await rescheduleAppointment(
        reschedulingAppointment._id,
        rescheduleForm.appointmentDate,
        rescheduleForm.slotTime
      );
      setReschedulingAppointment(null);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to reschedule appointment.');
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {role === 'doctor' ? 'Upcoming Appointments' : 'My Bookings'}
        </h2>
        {role === 'doctor' && appointments.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg border border-green-300 text-green-700 px-3 py-1.5 text-sm font-medium hover:bg-green-50 disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-gray-500">No appointments found.</p>
      ) : role === 'doctor' ? (
        <DoctorGroupedAppointments
          appointments={appointments}
          collapsedDates={collapsedDates}
          setCollapsedDates={setCollapsedDates}
          cardProps={{
            role,
            onStatusUpdate: handleStatusUpdate,
            onCheckIn: handleCheckIn,
            onReschedule: handleReschedule,
            onStartConsultation: setConsultationAppointment,
            onViewDoctorProfile: setProfileDoctorId,
            onCancel: setCancellingAppointment,
          }}
        />
      ) : (
        <PatientGroupedAppointments
          appointments={appointments}
          collapsedDates={collapsedDates}
          setCollapsedDates={setCollapsedDates}
          cardProps={{
            role,
            onStatusUpdate: handleStatusUpdate,
            onCheckIn: handleCheckIn,
            onReschedule: handleReschedule,
            onStartConsultation: setConsultationAppointment,
            onViewDoctorProfile: setProfileDoctorId,
            onCancel: setCancellingAppointment,
          }}
        />
      )}

      <Pagination pagination={pagination} onPageChange={handlePageChange} isLoading={isLoading} />

      {consultationAppointment && (
        <ConsultationWorkspace
          appointment={consultationAppointment}
          onClose={() => setConsultationAppointment(null)}
          onCompleted={refresh}
        />
      )}

      {cancellingAppointment && (
        <CancelAppointmentDialog
          appointment={cancellingAppointment}
          onClose={() => setCancellingAppointment(null)}
          onConfirm={handleCancelConfirm}
          isSubmitting={isCancelling}
        />
      )}

      {profileDoctorId && (
        <DoctorProfileModal doctorId={profileDoctorId} onClose={() => setProfileDoctorId('')} />
      )}

      {reschedulingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="surface w-full max-w-md p-6" role="dialog" aria-modal="true" aria-labelledby="reschedule-title">
            <p className="eyebrow mb-2">Appointment timing</p>
            <h3 id="reschedule-title" className="text-2xl font-bold text-gray-900 mb-1">Reschedule appointment</h3>
            <p className="text-sm text-gray-500 mb-5">
              Choose a new date and time. The appointment will return to pending until confirmed.
            </p>
            <form onSubmit={submitReschedule} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                New date
                <input
                  type="date"
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  value={rescheduleForm.appointmentDate}
                  onChange={(event) => setRescheduleForm((previous) => ({ ...previous, appointmentDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                New time
                <input
                  type="time"
                  required
                  value={rescheduleForm.slotTime}
                  onChange={(event) => setRescheduleForm((previous) => ({ ...previous, slotTime: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingAppointment(null)}
                  className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isRescheduling} className="primary-action disabled:opacity-50">
                  {isRescheduling ? 'Saving...' : 'Save new time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentList;
