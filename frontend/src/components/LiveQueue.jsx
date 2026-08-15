import { useEffect } from 'react';
import { useLiveQueue } from '../hooks/useLiveQueue';

// Doctor panel: call-next / skip controls. Patient panel: live position tracker.
function LiveQueue({ clinicId, role, avgConsultationMins = 15, myAppointmentId }) {
  const {
    liveQueue,
    currentPatient,
    estimatedWaitTime,
    isConnecting,
    joinClinicQueue,
    triggerNextPatient,
    triggerSkipPatient,
    finishConsultation,
  } = useLiveQueue();

  useEffect(() => {
    if (clinicId) {
      joinClinicQueue(clinicId, avgConsultationMins);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  if (!clinicId) {
    return null;
  }

  if (role === 'doctor') {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Live Queue</h2>
          <span className={`text-xs font-medium ${isConnecting ? 'text-gray-400' : 'text-green-600'}`}>
            {isConnecting ? 'Connecting…' : 'Live'}
          </span>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-500 uppercase">Now Serving</p>
            <p className="text-lg font-semibold text-blue-900">
              {currentPatient ? currentPatient.patientName : 'No patient currently in consultation'}
            </p>
          </div>
          <div className="flex gap-2">
            {currentPatient && (
              <button
                type="button"
                onClick={() => finishConsultation(clinicId, avgConsultationMins)}
                className="rounded-lg bg-gray-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-gray-800"
              >
                Finish
              </button>
            )}
            <button
              type="button"
              onClick={() => triggerNextPatient(clinicId, avgConsultationMins)}
              disabled={liveQueue.length === 0}
              className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Call Next Patient
            </button>
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-2">Waiting ({liveQueue.length})</p>
        {liveQueue.length === 0 ? (
          <p className="text-sm text-gray-500">No patients waiting.</p>
        ) : (
          <div className="space-y-2">
            {liveQueue.map((entry, index) => (
              <div
                key={entry.appointmentId}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-gray-800">
                  {index + 1}. {entry.patientName}
                </span>
                <button
                  type="button"
                  onClick={() => triggerSkipPatient(clinicId, entry.appointmentId, avgConsultationMins)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Skip
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const myPosition = myAppointmentId
    ? liveQueue.findIndex((entry) => entry.appointmentId === myAppointmentId) + 1
    : 0;
  const isMyTurn = currentPatient?.appointmentId === myAppointmentId;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Live Queue Status</h2>
        <span className={`text-xs font-medium ${isConnecting ? 'text-gray-400' : 'text-green-600'}`}>
          {isConnecting ? 'Connecting…' : 'Live'}
        </span>
      </div>

      {isMyTurn ? (
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-lg font-semibold text-green-700">It's your turn — please proceed to the consultation room.</p>
        </div>
      ) : (
        <div className="bg-blue-50 rounded-lg p-4 space-y-1">
          <p className="text-sm text-blue-900">
            Currently serving:{' '}
            <span className="font-semibold">{currentPatient ? currentPatient.patientName : '—'}</span>
          </p>
          {myPosition > 0 && <p className="text-sm text-blue-900">Your position in queue: #{myPosition}</p>}
          <p className="text-sm text-blue-900">Estimated wait time: ~{estimatedWaitTime} mins</p>
        </div>
      )}
    </div>
  );
}

export default LiveQueue;
