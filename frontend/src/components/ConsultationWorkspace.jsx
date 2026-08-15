import { useEffect, useState } from 'react';
import { createConsultation, fetchPatientHistory, downloadPrescription } from '../api/consultationService';

const EMPTY_MEDICINE = { name: '', dosage: '', durationDays: '', instructions: '' };

// Doctor-facing EMR workspace: record a diagnosis/prescription for an appointment
// and browse the patient's prior consultation history with PDF downloads.
function ConsultationWorkspace({ appointment, onClose, onCompleted }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicines, setMedicines] = useState([{ ...EMPTY_MEDICINE }]);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patientId = appointment.patientId?._id || appointment.patientId;

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const data = await fetchPatientHistory(patientId);
        setHistory(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load patient history.');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [patientId]);

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addMedicineRow = () => setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }]);

  const removeMedicineRow = (index) => setMedicines((prev) => prev.filter((_, rowIndex) => rowIndex !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await createConsultation({
        appointmentId: appointment._id,
        patientId,
        doctorId: appointment.doctorId?._id || appointment.doctorId,
        clinicId: appointment.clinicId?._id || appointment.clinicId,
        diagnosis,
        clinicalNotes,
        medicines: medicines
          .filter((medicine) => medicine.name.trim())
          .map((medicine) => ({ ...medicine, durationDays: Number(medicine.durationDays) || 1 })),
      });

      if (onCompleted) onCompleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save consultation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const patientName = appointment.patientId?.patientProfile?.name || appointment.patientId?.email || 'Patient';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Consultation — {patientName}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              id="diagnosis"
              required
              rows={2}
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="clinicalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Notes
            </label>
            <textarea
              id="clinicalNotes"
              rows={2}
              value={clinicalNotes}
              onChange={(event) => setClinicalNotes(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Prescription</h3>
            <div className="space-y-2">
              {medicines.map((medicine, index) => (
                <div key={index} className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Medicine name"
                    value={medicine.name}
                    onChange={(event) => handleMedicineChange(index, 'name', event.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm flex-1 min-w-[140px]"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 1-0-1)"
                    value={medicine.dosage}
                    onChange={(event) => handleMedicineChange(index, 'dosage', event.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-36"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Days"
                    value={medicine.durationDays}
                    onChange={(event) => handleMedicineChange(index, 'durationDays', event.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-20"
                  />
                  <input
                    type="text"
                    placeholder="Instructions"
                    value={medicine.instructions}
                    onChange={(event) => handleMedicineChange(index, 'instructions', event.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm flex-1 min-w-[140px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicineRow(index)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addMedicineRow} className="mt-2 text-sm text-blue-600 hover:underline">
              + Add medicine
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save & Complete'}
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Medical History</h3>
          {isLoadingHistory ? (
            <p className="text-sm text-gray-500">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No previous consultations.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry._id}
                  className="border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.diagnosis}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString()} — {entry.clinicId?.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadPrescription(entry._id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Download PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsultationWorkspace;
