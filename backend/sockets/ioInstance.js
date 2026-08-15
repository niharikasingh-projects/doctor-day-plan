// Simple module-level singleton so REST controllers (running outside the socket
// connection lifecycle) can access the shared Socket.io instance created in server.js.
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

module.exports = { setIO, getIO };
