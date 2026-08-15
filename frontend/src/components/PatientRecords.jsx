import { useState } from 'react';
import MedicalHistory from './MedicalHistory';
import { searchPatients } from '../api/consultationService';

function PatientRecords() {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters to search.');
      setPatients([]);
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      setPatients(await searchPatients(query.trim()));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to search patient records.');
      setPatients([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Patient Records</h2>
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by patient name, email, or phone"
            className="flex-1 min-w-[260px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        {patients.length > 0 && (
          <div className="mt-4 divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {patients.map((patient) => (
              <button
                key={patient._id}
                type="button"
                onClick={() => setSelectedPatient(patient)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 ${
                  selectedPatient?._id === patient._id ? 'bg-blue-50' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{patient.patientProfile?.name || 'Unnamed patient'}</p>
                <p className="text-xs text-gray-500">
                  {patient.email} {patient.phone ? `· ${patient.phone}` : ''}
                </p>
              </button>
            ))}
          </div>
        )}
        {!isSearching && query.trim().length >= 2 && patients.length === 0 && !error && (
          <p className="text-sm text-gray-500 mt-4">No patients found in your appointment records.</p>
        )}
      </section>

      {selectedPatient && (
        <MedicalHistory
          patientId={selectedPatient._id}
          title={`${selectedPatient.patientProfile?.name || 'Patient'} — Medical History`}
        />
      )}
    </div>
  );
}

export default PatientRecords;
