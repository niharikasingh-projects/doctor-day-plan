import { useEffect, useState } from 'react';
import {
  createClinic,
  deleteClinic,
  fetchDoctorClinics,
  setUnavailableDate,
  updateClinic,
} from '../api/clinicService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_CLINIC_FORM = {
  name: '',
  address: '',
  contactPhone: '',
  status: 'active',
  scheduleRules: [{ dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }],
};

const getTodayDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getClinicAvailability = (clinic) => {
  if (clinic.status !== 'active') {
    return { label: 'Inactive', classes: 'bg-gray-100 text-gray-600' };
  }

  const today = new Date();
  const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const hasScheduleToday = clinic.scheduleRules.some((rule) => rule.dayOfWeek === todayName);
  const todayKey = getTodayDateKey();
  const isDoctorUnavailable = clinic.doctorId?.doctorProfile?.unavailableDates?.some(
    (entry) => new Date(entry.date).toISOString().slice(0, 10) === todayKey
  );

  if (isDoctorUnavailable) {
    return { label: 'Doctor unavailable today', classes: 'bg-red-100 text-red-700' };
  }

  if (!hasScheduleToday) {
    return { label: 'Closed today', classes: 'bg-amber-100 text-amber-700' };
  }

  return { label: 'Available today', classes: 'bg-green-100 text-green-700' };
};

function ClinicManager() {
  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clinicForm, setClinicForm] = useState(EMPTY_CLINIC_FORM);
  const [editingClinic, setEditingClinic] = useState(null);
  const [unavailableForm, setUnavailableForm] = useState({ date: '', reason: '' });
  const [unavailableStatus, setUnavailableStatus] = useState('');

  const loadClinics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDoctorClinics();
      setClinics(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load clinics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const handleScheduleRuleChange = (index, field, value) => {
    setClinicForm((prev) => {
      const scheduleRules = [...prev.scheduleRules];
      scheduleRules[index] = { ...scheduleRules[index], [field]: value };
      return { ...prev, scheduleRules };
    });
  };

  const addScheduleRuleRow = () => {
    setClinicForm((prev) => ({
      ...prev,
      scheduleRules: [...prev.scheduleRules, { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00' }],
    }));
  };

  const removeScheduleRuleRow = (index) => {
    setClinicForm((prev) => ({
      ...prev,
      scheduleRules: prev.scheduleRules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const handleCreateClinic = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editingClinic) {
        await updateClinic(editingClinic._id, clinicForm);
      } else {
        await createClinic(clinicForm);
      }
      setIsModalOpen(false);
      setClinicForm(EMPTY_CLINIC_FORM);
      setEditingClinic(null);
      await loadClinics();
    } catch (err) {
      setError(err.response?.data?.error || (editingClinic ? 'Unable to update clinic.' : 'Unable to create clinic.'));
    }
  };

  const handleEditClinic = (clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name,
      address: clinic.address,
      contactPhone: clinic.contactPhone || '',
      status: clinic.status,
      scheduleRules: clinic.scheduleRules.map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
      })),
    });
    setIsModalOpen(true);
  };

  const handleDeleteClinic = async (clinic) => {
    if (!window.confirm(`Deactivate ${clinic.name}? It will stop accepting new bookings and can be reactivated later.`)) return;

    setError('');
    try {
      await deleteClinic(clinic._id);
      await loadClinics();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to archive clinic.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClinic(null);
    setClinicForm(EMPTY_CLINIC_FORM);
  };

  const handleUnavailableSubmit = async (event) => {
    event.preventDefault();
    setUnavailableStatus('');
    try {
      await setUnavailableDate(unavailableForm);
      setUnavailableStatus('Unavailable date saved.');
      setUnavailableForm({ date: '', reason: '' });
      await loadClinics();
    } catch (err) {
      setUnavailableStatus(err.response?.data?.error || 'Unable to save unavailable date.');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Clinics</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700"
        >
          + Add Clinic
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading clinics...</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {clinics.length === 0 && <p className="text-gray-500">No clinics yet. Add your first clinic.</p>}
          {clinics.map((clinic) => (
            <div key={clinic._id} className="w-full sm:w-72 bg-white rounded-xl shadow p-4 border border-gray-100">
              {(() => {
                const availability = getClinicAvailability(clinic);
                return (
                  <>
              <h2 className="text-lg font-medium text-gray-900">{clinic.name}</h2>
              <p className="text-sm text-gray-500">{clinic.address}</p>
              {clinic.contactPhone && <p className="text-sm text-gray-500">{clinic.contactPhone}</p>}
              <span
                className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${availability.classes}`}
              >
                {availability.label}
              </span>
              <ul className="mt-3 space-y-1">
                {clinic.scheduleRules.map((rule, index) => (
                  <li key={index} className="text-xs text-gray-600">
                    {rule.dayOfWeek}: {rule.startTime} - {rule.endTime}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleEditClinic(clinic)}
                  className="rounded-lg border border-blue-200 text-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClinic(clinic)}
                  className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm font-medium hover:bg-red-50"
                >
                  Deactivate
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 bg-white rounded-xl shadow p-6 max-w-md">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Mark Unavailable Date</h2>
        <form onSubmit={handleUnavailableSubmit} className="space-y-3">
          <input
            type="date"
            required
            value={unavailableForm.date}
            onChange={(event) => setUnavailableForm((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={unavailableForm.reason}
            onChange={(event) => setUnavailableForm((prev) => ({ ...prev, reason: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {unavailableStatus && <p className="text-sm text-gray-600">{unavailableStatus}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-800 text-white py-2 font-medium hover:bg-gray-900"
          >
            Save
          </button>
        </form>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingClinic ? 'Edit Clinic' : 'Add Clinic'}
            </h2>
            <form onSubmit={handleCreateClinic} className="space-y-4">
              <input
                type="text"
                placeholder="Clinic Name"
                required
                value={clinicForm.name}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Address"
                required
                value={clinicForm.address}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Contact Phone"
                value={clinicForm.contactPhone}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={clinicForm.status}
                onChange={(event) => setClinicForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Weekly Schedule</h3>
                <div className="space-y-2">
                  {clinicForm.scheduleRules.map((rule, index) => (
                    <div key={index} className="flex flex-wrap gap-2 items-center">
                      <select
                        value={rule.dayOfWeek}
                        onChange={(event) => handleScheduleRuleChange(index, 'dayOfWeek', event.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        {DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={rule.startTime}
                        onChange={(event) => handleScheduleRuleChange(index, 'startTime', event.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={rule.endTime}
                        onChange={(event) => handleScheduleRuleChange(index, 'endTime', event.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeScheduleRuleRow(index)}
                        className="text-red-500 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addScheduleRuleRow}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  + Add day
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700"
                >
                  {editingClinic ? 'Update Clinic' : 'Save Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicManager;
