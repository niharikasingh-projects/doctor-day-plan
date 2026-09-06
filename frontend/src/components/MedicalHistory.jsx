import { useEffect, useState } from 'react';
import { downloadPrescription, fetchPatientHistory } from '../api/consultationService';
import Pagination from './Pagination';
import { exportToExcel, consultationToRow } from '../utils/exportExcel';

const PAGE_SIZE = 10;

function MedicalHistory({ patientId, title = 'Medical History' }) {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(patientId));
  const [isExporting, setIsExporting] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) {
      return;
    }

    let isCancelled = false;
    const loadHistory = async () => {
      try {
        const result = await fetchPatientHistory(patientId, { page, limit: PAGE_SIZE });
        if (isCancelled) return;
        setHistory(result.data || []);
        setPagination(result.pagination || null);
      } catch (err) {
        if (!isCancelled) setError(err.response?.data?.error || 'Unable to load medical history.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadHistory();
    return () => {
      isCancelled = true;
    };
  }, [patientId, page]);

  const handlePageChange = (nextPage) => {
    setIsLoading(true);
    setError('');
    setPage(nextPage);
  };

  const handleDownload = async (consultationId) => {
    setError('');
    setDownloadingId(consultationId);
    try {
      await downloadPrescription(consultationId);
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Unable to download prescription.');
    } finally {
      setDownloadingId('');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      const result = await fetchPatientHistory(patientId, { all: true });
      const rows = (result.data || []).map(consultationToRow);
      exportToExcel(rows, `patient-history-${new Date().toISOString().slice(0, 10)}`, 'Medical History');
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Unable to export medical history.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {patientId && history.length > 0 && (
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
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {!patientId ? (
        <p className="text-sm text-gray-500">Select a patient to view medical history.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Loading medical history...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-500">No previous consultations found.</p>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <article key={entry._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">{entry.diagnosis}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(entry.createdAt).toLocaleDateString()} · {entry.clinicId?.name || 'Clinic'}
                  </p>
                  {entry.doctorId?.doctorProfile?.name && (
                    <p className="text-xs text-gray-500">Dr. {entry.doctorId.doctorProfile.name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(entry._id)}
                  disabled={downloadingId === entry._id}
                  className="rounded-lg border border-blue-200 text-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                >
                  {downloadingId === entry._id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>

              {entry.clinicalNotes && (
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{entry.clinicalNotes}</p>
              )}

              {entry.medicines?.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Prescribed Medicines</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[480px]">
                      <thead className="text-xs text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="py-2 pr-3">Medicine</th>
                          <th className="py-2 pr-3">Dosage</th>
                          <th className="py-2 pr-3">Duration</th>
                          <th className="py-2">Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.medicines.map((medicine, index) => (
                          <tr key={`${entry._id}-${index}`} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pr-3 text-gray-900">{medicine.name}</td>
                            <td className="py-2 pr-3 text-gray-600">{medicine.dosage}</td>
                            <td className="py-2 pr-3 text-gray-600">{medicine.durationDays} days</td>
                            <td className="py-2 text-gray-600">{medicine.instructions || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={handlePageChange} isLoading={isLoading} />
    </section>
  );
}

export default MedicalHistory;
