import axiosInstance from './axiosInstance';

/**
 * Books a new appointment slot as the authenticated patient.
 * @param {{ clinicId: string, doctorId: string, appointmentDate: string, slotTime: string }} payload
 */
export const bookAppointment = async (payload) => {
  const { data } = await axiosInstance.post('/appointments', payload);
  return data;
};

/**
 * Fetches today's appointments for the authenticated doctor.
 */
export const fetchTodayAppointments = async () => {
  const { data } = await axiosInstance.get('/appointments/today');
  return data;
};

/**
 * Fetches all of the authenticated doctor's current & future appointments (any date).
 */
export const fetchUpcomingAppointments = async () => {
  const { data } = await axiosInstance.get('/appointments/upcoming');
  return data;
};

/**
 * Fetches the authenticated patient's own bookings.
 */
export const fetchMyAppointments = async () => {
  const { data } = await axiosInstance.get('/appointments/my');
  return data;
};

/**
 * Transitions an appointment's status (doctor: confirmed/rejected, patient: cancelled).
 * @param {string} id
 * @param {string} status
 * @param {string} [cancelReason]
 */
export const updateAppointmentStatus = async (id, status, cancelReason) => {
  const { data } = await axiosInstance.patch(`/appointments/${id}/status`, { status, cancelReason });
  return data;
};

/**
 * Marks the authenticated patient as checked in for an appointment.
 * @param {string} id
 */
export const checkInAppointment = async (id) => {
  const { data } = await axiosInstance.patch(`/appointments/${id}/checkin`);
  return data;
};
