import { useQueueContext } from '../context/QueueContext';

// Simple wrapper commands so components never touch raw socket.emit/on logic directly.
export function useLiveQueue() {
  const { socket, liveQueue, currentPatient, estimatedWaitTime, isConnecting } = useQueueContext();

  const joinClinicQueue = (clinicId, avgConsultationMins) => {
    if (!socket || !clinicId) return;
    socket.emit('joinQueueRoom', { clinicId, avgConsultationMins });
  };

  const triggerNextPatient = (clinicId, avgConsultationMins) => {
    if (!socket || !clinicId) return;
    socket.emit('callNextPatient', { clinicId, avgConsultationMins });
  };

  const triggerSkipPatient = (clinicId, appointmentId, avgConsultationMins) => {
    if (!socket || !clinicId || !appointmentId) return;
    socket.emit('skipPatient', { clinicId, appointmentId, avgConsultationMins });
  };

  const finishConsultation = (clinicId, avgConsultationMins) => {
    if (!socket || !clinicId) return;
    socket.emit('consultationFinished', { clinicId, avgConsultationMins });
  };

  return {
    liveQueue,
    currentPatient,
    estimatedWaitTime,
    isConnecting,
    joinClinicQueue,
    triggerNextPatient,
    triggerSkipPatient,
    finishConsultation,
  };
}
