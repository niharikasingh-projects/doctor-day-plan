import axiosInstance from './axiosInstance';

/**
 * Creates a new clinic owned by the authenticated doctor.
 * @param {{ name: string, address: string, contactPhone: string, scheduleRules: Array }} payload
 */
export const createClinic = async (payload) => {
  const { data } = await axiosInstance.post('/clinics', payload);
  return data;
};

/**
 * Fetches all active clinics (with populated doctor details) for booking selection.
 */
export const fetchAllClinics = async () => {
  const { data } = await axiosInstance.get('/clinics');
  return data;
};

/**
 * Fetches all clinics owned by the authenticated doctor.
 */
export const fetchDoctorClinics = async () => {
  const { data } = await axiosInstance.get('/clinics/my-clinics');
  return data;
};

/**
 * Pushes an unavailable date onto the authenticated doctor's profile.
 * @param {{ date: string, reason?: string }} payload
 */
export const setUnavailableDate = async (payload) => {
  const { data } = await axiosInstance.patch('/clinics/unavailable-dates', payload);
  return data;
};

/**
 * Fetches the raw generated available slot strings for a clinic on a given date.
 * @param {string} clinicId
 * @param {string} date ISO date string (YYYY-MM-DD)
 */
export const fetchAvailableSlots = async (clinicId, date) => {
  const { data } = await axiosInstance.get(`/clinics/${clinicId}/slots`, { params: { date } });
  return data;
};

/**
 * Fetches a per-date availability map (true/false) for a whole month, used to highlight a calendar.
 * @param {string} clinicId
 * @param {string} month ISO year-month string (YYYY-MM)
 */
export const fetchMonthlyAvailability = async (clinicId, month) => {
  const { data } = await axiosInstance.get(`/clinics/${clinicId}/monthly-availability`, { params: { month } });
  return data;
};
