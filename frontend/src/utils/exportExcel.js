import * as XLSX from 'xlsx';

/**
 * Exports an array of flat row objects to a real .xlsx workbook and triggers a
 * browser download. Column order follows the key order of the first row.
 * @param {Array<Object>} rows flat objects (values must be strings/numbers)
 * @param {string} fileName download file name (".xlsx" appended if missing)
 * @param {string} sheetName worksheet tab name (max 31 chars)
 */
export const exportToExcel = (rows, fileName, sheetName = 'Data') => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('There is no data to export.');
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({
    wch: Math.min(40, Math.max(12, key.length + 4)),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
};

/** Flattens one appointment document into an export-ready row. */
export const appointmentToRow = (appointment) => ({
  Date: new Date(appointment.appointmentDate).toLocaleDateString(),
  Time: appointment.slotTime,
  Patient:
    appointment.patientId?.patientProfile?.name || appointment.patientId?.email || '',
  'Patient Email': appointment.patientId?.email || '',
  'Patient Phone': appointment.patientId?.phone || '',
  Clinic: appointment.clinicId?.name || '',
  Status: appointment.status,
  'Checked In': appointment.checkedInAt
    ? new Date(appointment.checkedInAt).toLocaleString()
    : '',
  'Cancel Reason': appointment.cancelReason || '',
});

/** Flattens one consultation document into an export-ready row. */
export const consultationToRow = (entry) => ({
  Date: new Date(entry.createdAt).toLocaleDateString(),
  Diagnosis: entry.diagnosis,
  Doctor: entry.doctorId?.doctorProfile?.name ? `Dr. ${entry.doctorId.doctorProfile.name}` : '',
  Clinic: entry.clinicId?.name || '',
  'Clinical Notes': entry.clinicalNotes || '',
  Medicines: (entry.medicines || [])
    .map(
      (medicine) =>
        `${medicine.name} ${medicine.dosage} x${medicine.durationDays}d${medicine.instructions ? ` (${medicine.instructions})` : ''}`
    )
    .join('; '),
});
