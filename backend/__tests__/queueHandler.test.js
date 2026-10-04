jest.mock('../models/Appointment', () => ({
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

const Appointment = require('../models/Appointment');
const { addPatientToQueue, getOrCreateQueue, hydrateQueue, removeAppointmentsFromQueues } = require('../sockets/queueHandler');

const createIO = () => ({
  to: jest.fn(() => ({ emit: jest.fn() })),
});

beforeEach(() => {
  jest.clearAllMocks();
  const queue = getOrCreateQueue('reset-clinic');
  queue.currentPatient = null;
  queue.waitingQueue = [];
});

test('does not add the same checked-in appointment to a queue twice', () => {
  const io = createIO();
  const patient = { appointmentId: 'appointment-1', patientId: 'patient-1', patientName: 'Patient One' };

  addPatientToQueue(io, 'dedupe-clinic', patient);
  addPatientToQueue(io, 'dedupe-clinic', patient);

  expect(getOrCreateQueue('dedupe-clinic').waitingQueue).toHaveLength(1);
});

test('skip moves the selected patient to the end and broadcasts the updated queue', () => {
  const queue = getOrCreateQueue('skip-clinic');
  queue.waitingQueue = [
    { appointmentId: 'appointment-1', patientName: 'Patient One' },
    { appointmentId: 'appointment-2', patientName: 'Patient Two' },
    { appointmentId: 'appointment-3', patientName: 'Patient Three' },
  ];

  const socketHandlers = {};
  const broadcast = { emit: jest.fn() };
  const io = {
    on: jest.fn(),
    to: jest.fn(() => broadcast),
  };
  const socket = {
    on: jest.fn((event, handler) => {
      socketHandlers[event] = handler;
    }),
  };
  const { initQueueHandler } = require('../sockets/queueHandler');
  initQueueHandler(io);
  io.on.mock.calls[0][1](socket);

  socketHandlers.skipPatient({ clinicId: 'skip-clinic', appointmentId: 'appointment-1' });

  expect(queue.waitingQueue.map((entry) => entry.appointmentId)).toEqual([
    'appointment-2',
    'appointment-3',
    'appointment-1',
  ]);
  expect(io.to).toHaveBeenCalledWith('skip-clinic');
  expect(broadcast.emit).toHaveBeenCalledWith(
    'queueUpdated',
    expect.objectContaining({ waitingQueueArray: queue.waitingQueue })
  );
});

test('hydrates current and waiting patients from checked-in appointments', async () => {
  const io = createIO();
  const appointments = [
    {
      _id: 'current-id',
      checkedInAt: new Date('2026-08-15T09:00:00Z'),
      status: 'inConsultation',
      patientId: { _id: 'patient-1', email: 'one@test.example', patientProfile: { name: 'Patient One' } },
    },
    {
      _id: 'waiting-id',
      checkedInAt: new Date('2026-08-15T09:05:00Z'),
      status: 'confirmed',
      patientId: { _id: 'patient-2', email: 'two@test.example', patientProfile: { name: 'Patient Two' } },
    },
  ];
  Appointment.find.mockReturnValue({
    populate: jest.fn().mockResolvedValue(appointments),
  });

  await hydrateQueue(io, 'hydrate-clinic');
  const queue = getOrCreateQueue('hydrate-clinic');

  expect(queue.currentPatient.appointmentId).toBe('current-id');
  expect(queue.waitingQueue).toHaveLength(1);
  expect(queue.waitingQueue[0].appointmentId).toBe('waiting-id');
});

test('removes cancelled appointments from waiting and current queue state', () => {
  const io = createIO();
  const queue = getOrCreateQueue('remove-clinic');
  queue.currentPatient = { appointmentId: 'current-id', patientId: 'patient-1' };
  queue.waitingQueue = [
    { appointmentId: 'waiting-id', patientId: 'patient-2' },
    { appointmentId: 'keep-id', patientId: 'patient-3' },
  ];

  removeAppointmentsFromQueues(io, [{ _id: 'current-id', clinicId: 'remove-clinic' }, { _id: 'waiting-id', clinicId: 'remove-clinic' }]);

  expect(queue.currentPatient).toBeNull();
  expect(queue.waitingQueue.map((entry) => entry.appointmentId)).toEqual(['keep-id']);
});

test('persists current patient transitions when queue handlers are initialized', async () => {
  const io = { on: jest.fn() };
  const { initQueueHandler } = require('../sockets/queueHandler');
  initQueueHandler(io);
  expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
  expect(Appointment.findByIdAndUpdate).not.toHaveBeenCalled();
});
