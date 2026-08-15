import axiosInstance from './axiosInstance';

/**
 * Saves a new consultation record and marks the underlying appointment completed.
 * @param {{ appointmentId: string, patientId: string, doctorId: string, clinicId: string, diagnosis: string, clinicalNotes?: string, medicines?: Array }} payload
 */
export const createConsultation = async (payload) => {
  const { data } = await axiosInstance.post('/consultations', payload);
  return data;
};

/**
 * Fetches a patient's consultation history, populated with clinic and doctor details.
 * @param {string} patientId
 */
export const fetchPatientHistory = async (patientId) => {
  const { data } = await axiosInstance.get(`/consultations/patient/${patientId}`);
  return data;
};

/**
 * Searches patients already associated with the authenticated doctor's appointments.
 * @param {string} query
 */
export const searchPatients = async (query) => {
  const { data } = await axiosInstance.get('/consultations/search', { params: { query } });
  return data;
};

/**
 * Downloads the PDFKit-streamed prescription for a consultation and triggers a browser save.
 * @param {string} consultationId
 */
export const downloadPrescription = async (consultationId) => {
  const response = await axiosInstance.get(`/consultations/${consultationId}/download`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `prescription-${consultationId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
