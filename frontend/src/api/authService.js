import axiosInstance from './axiosInstance';

/**
 * Logs a user in and persists the JWT and role to localStorage on success.
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
  const { data } = await axiosInstance.post('/auth/login', { email, password });

  if (data?.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('name', data.user?.name || data.user?.email || '');
    localStorage.setItem('userId', data.user?.id || '');
  }

  return data;
};

/**
 * Registers a new patient account with an embedded patientProfile.
 * @param {{ email: string, password: string, phone: string, patientProfile: { name: string, dob: string, gender: string } }} payload
 */
export const register = async (payload) => {
  const { data } = await axiosInstance.post('/auth/register', payload);
  return data;
};

/**
 * Registers a new doctor account with an embedded doctorProfile.
 * @param {{ email: string, password: string, phone: string, doctorProfile: { name: string, specialization: string } }} payload
 */
export const registerDoctor = async (payload) => {
  const { data } = await axiosInstance.post('/auth/register/doctor', payload);
  return data;
};

export const getProfile = async () => {
  const { data } = await axiosInstance.get('/auth/profile');
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await axiosInstance.patch('/auth/profile', payload);
  if (data?.doctorProfile?.name || data?.patientProfile?.name) {
    localStorage.setItem('name', data.doctorProfile?.name || data.patientProfile?.name);
  }
  return data;
};

/**
 * Clears the local session and redirects to the login page.
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  localStorage.removeItem('userId');
  window.location.href = '/login';
};
