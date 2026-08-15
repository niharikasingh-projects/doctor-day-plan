import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const QueueContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function QueueProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [liveQueue, setLiveQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    const handleConnect = () => setIsConnecting(false);
    const handleDisconnect = () => setIsConnecting(true);
    const handleQueueUpdated = (payload) => {
      setCurrentPatient(payload?.currentPatient || null);
      setLiveQueue(payload?.waitingQueueArray || []);
      setEstimatedWaitTime(payload?.estimatedWaitTime || 0);
    };

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('queueUpdated', handleQueueUpdated);

    setSocket(newSocket);

    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('queueUpdated', handleQueueUpdated);
      newSocket.disconnect();
    };
  }, []);

  const value = { socket, liveQueue, currentPatient, estimatedWaitTime, isConnecting };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueueContext() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within a QueueProvider');
  }
  return context;
}
