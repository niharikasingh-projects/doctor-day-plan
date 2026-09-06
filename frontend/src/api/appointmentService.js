import axiosInstance from './axiosInstance';

/**
 * Books a new appointment slot as the authenticated patient.
 * @param {{ clinicId: string, doctorId: string, appointmentDate: string, slotTime: string }} payload
 */
export const bookAppointment = async (payload) => {
  const { data } = await axiosInstance.post('/appointments', payload);
  return data;
};

export const triggerDoctorEmergency = async (reason) => {
  const { data } = await axiosInstance.post('/appointments/emergency', { reason });
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
 * Fetches the authenticated doctor's current & future appointments.
 * Paginated: pass { page, limit } (default 1/10) or { all: true } for export.
 * @returns {{ data: Array, pagination: { total: number, page: number, limit: number, totalPages: number } }}
 */
export const fetchUpcomingAppointments = async ({ page = 1, limit = 10, all = false } = {}) => {
  const { data } = await axiosInstance.get('/appointments/upcoming', {
    params: all ? { all: true } : { page, limit },
  });
  return data;
};

/**
 * Fetches the authenticated patient's own bookings (paginated envelope).
 */
export const fetchMyAppointments = async ({ page = 1, limit = 10, all = false } = {}) => {
  const { data } = await axiosInstance.get('/appointments/my', {
    params: all ? { all: true } : { page, limit },
  });
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

export const rescheduleAppointment = async (id, appointmentDate, slotTime) => {
  const { data } = await axiosInstance.patch(`/appointments/${id}/reschedule`, { appointmentDate, slotTime });
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
