const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db.js'); // Import the db connection script

const app = express();

// Establish connectivity right at application boot
connectDB();

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

// Serve Compiled Client UI in Production Environment
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start Listening to Traffic Gateway
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Server executing safely in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🔌 Listening for API network traffic on port: ${PORT}`);
  console.log(`==================================================`);
});
