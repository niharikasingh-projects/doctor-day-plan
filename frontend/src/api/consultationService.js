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
 * Fetches a patient's consultation history (paginated envelope).
 * Pass { all: true } to fetch the full history for Excel export.
 * @param {string} patientId
 */
export const fetchPatientHistory = async (patientId, { page = 1, limit = 10, all = false } = {}) => {
  const { data } = await axiosInstance.get(`/consultations/patient/${patientId}`, {
    params: all ? { all: true } : { page, limit },
  });
  return data;
};

/**
 * Searches patients already associated with the authenticated doctor by
 * name, email, phone, or consultation diagnosis/illness (paginated envelope).
 * @param {string} query
 */
export const searchPatients = async (query, { page = 1, limit = 10 } = {}) => {
  const { data } = await axiosInstance.get('/consultations/search', { params: { query, page, limit } });
  return data;
};

/**
 * Streams the PDFKit prescription for a consultation and triggers a browser save.
 * Surfaces server-side JSON errors instead of silently saving them as a broken PDF,
 * and delays the object-URL revoke so the browser keeps the download alive.
 * @param {string} consultationId
 */
export const downloadPrescription = async (consultationId) => {
  const response = await axiosInstance.get(`/consultations/${consultationId}/download`, {
    responseType: 'blob',
  });

  const contentType = response.headers?.['content-type'] || '';
  if (!contentType.includes('application/pdf')) {
    // The server answered with a JSON error payload wrapped in a Blob.
    const text = await response.data.text();
    let message = 'Unable to download prescription.';
    try {
      message = JSON.parse(text).error || message;
    } catch {
      // Keep the generic message if the payload is not JSON.
    }
    throw new Error(message);
  }

  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `prescription-${consultationId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay the revoke: releasing the URL in the same tick can cancel the download.
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
