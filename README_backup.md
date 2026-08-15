# doctor-day-plan
DoctorDayPlan v1.0 is a doctor-centric practice management platform designed for independent doctors operating one or more clinics. The application aims to digitize the daily workflow of a doctor's practice by replacing manual appointment registers, paper prescriptions, and dependency on front-desk staff for routine scheduling tasks.



# Workspace Dependencies Setup

# Install root-level packages (concurrently, nodemon, etc.)
npm install

# Install backend-specific packages
npm install express mongoose dotenv jsonwebtoken bcrypt socket.io pdfkit

# Install backend development and testing utilities
npm install --save-dev jest supertest mongodb-memory-server

# Navigate into the frontend and install client dependencies
cd frontend
npm install axios react-router-dom socket.io-client tailwindcss postcss autoprefixer
npm install --save-dev vite @vitejs/plugin-react

1. Project Initialization & Folder Scaffolding

# 1. Create and enter the root project directory
mkdir DoctorDayPlan
cd DoctorDayPlan

# 2. Initialize the root Node.js project
npm init -y

# 3. Create the backend folder structure
mkdir -p backend/config backend/controllers backend/middleware backend/models backend/routes backend/utils backend/__tests__ public

# 4. Scaffolding the React Frontend using Vite
npm create vite@latest frontend -- --template react

# 5. Create documentation and asset directories
mkdir -p docs/prompts .github/ISSUE_TEMPLATE .github/workflows

2. Root and Backend Package Installation

# In the project root directory:
npm install express mongoose dotenv jsonwebtoken bcrypt socket.io pdfkit cors

# Install development and orchestration execution tools
npm install --save-dev nodemon concurrently jest supertest mongodb-memory-server

3. Frontend Package & Tailwind CSS Setup

# Move into the frontend folder
cd frontend

# Install client packages
npm install axios react-router-dom socket.io-client

# Install Tailwind CSS and its layout utilities
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configure Tailwind Content PathsOpen the generated frontend/tailwind.config.js file and update the content array so it looks like this:

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

# Add Tailwind Directives to CSSReplace the entire contents of frontend/src/index.css with these three lines:
@tailwind base;
@tailwind components;
@tailwind utilities;

4. Environment Configuration (`.env`)Return to your project root folder (cd ..) and create a .env file to hold your system parameters safely:

PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/doctordayplan
JWT_SECRET=super_secret_healthcare_signing_token_change_in_production
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000

5. Entry Points & Automation ScriptsBase Express Server (server.js)Create a baseline server.js file in your root folder so the system can boot cleanly:

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static compiled frontend assets in production
app.use(express.static(path.join(__dirname, 'frontend/dist')));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'DoctorDayPlan API running successfully' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server executing safely on port ${PORT}`));


Automation Script Matrix (package.json)Open your root-level package.json file and overwrite the "scripts" section to map your execution pipelines:

"scripts": {
  "backend": "nodemon server.js",
  "frontend": "cd frontend && npm run dev",
  "dev": "concurrently \"npm run backend\" \"npm run frontend\"",
  "test": "jest --runInBand --detectOpenHandles"
}

6. Execution GridStart Local Development StudioType this in your root folder terminal to launch both the API engine and the Vite hot-reloading user interface simultaneously:

npm run dev

Run Integrity SuiteType this to execute your mock environment database unit tests:

npm run test
