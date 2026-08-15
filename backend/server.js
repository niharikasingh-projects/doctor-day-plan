const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const connectDB = require('./config/db.js'); // Import the db connection script
const authRoutes = require('./routes/authRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const { setIO } = require('./sockets/ioInstance');
const { initQueueHandler } = require('./sockets/queueHandler');

const app = express();

// Middleware Global Configuration
app.use(cors());
app.use(express.json());

// API Baseline Health Monitor Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'DoctorDayPlan API engine is executing safely.' 
  });
});

// Feature Module API Routers
app.use('/api/auth', authRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);

// Serve Compiled Client UI in Production Environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Wrap Express inside a native HTTP server so Socket.io can share the same port
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setIO(io);
initQueueHandler(io);

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB();
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Server executing safely in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`🔌 Listening for API network traffic on port: ${PORT}`);
    console.log(`📡 Socket.io live queue gateway is active`);
    console.log(`==================================================`);
  });
}

module.exports = { app, server, io };
