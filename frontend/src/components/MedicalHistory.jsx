import { useEffect, useState } from 'react';
import { downloadPrescription, fetchPatientHistory } from '../api/consultationService';

function MedicalHistory({ patientId, title = 'Medical History' }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(patientId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) {
      return;
    }

    const loadHistory = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchPatientHistory(patientId);
        setHistory(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load medical history.');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [patientId]);

  return (
    <section className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
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
                  onClick={() => downloadPrescription(entry._id)}
                  className="rounded-lg border border-blue-200 text-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-50"
                >
                  Download PDF
                </button>
              </div>

              {entry.clinicalNotes && (
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{entry.clinicalNotes}</p>
              )}

              {entry.medicines?.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Prescribed Medicines</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
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
    </section>
  );
}

export default MedicalHistory;
