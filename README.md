# DoctorDayPlan v1.0 🩺

DoctorDayPlan v1.0 is a doctor-centric practice management platform designed for independent doctors operating one or more clinics. The application digitizes the daily workflow of a doctor's practice by replacing manual appointment registers, paper prescriptions, and heavy dependency on front-desk staff for routine scheduling tasks.

---

## 🚀 Key System Features
* **Role-Based Workspaces:** Streamlined pipelines customized for Doctors (Primary User) and Patients (Secondary User).
* **Automated Slot Engine:** Dynamic generation of available consultation windows based on complex weekly clinical rule parameters.
* **Real-Time Live Queue:** Seamless WebSocket state synchronization utilizing Socket.io to stream real-time queue positions and wait times.
* **Digital Prescription Desk:** Integrated server-side compilation streaming professional PDF documents instantly on-demand using PDFKit.

---

## 🏗️ Architecture & Stack Blueprint
* **Frontend UI:** React.js, React Router v6+, Tailwind CSS v4, Axios, Socket.io-client.
* **Backend Core:** Node.js, Express.js, jsonwebtoken, bcrypt, Socket.io (v4+), PDFKit.
* **Database Engine:** MongoDB (Mongoose ODM) implementing embedded optimization for role-specific profile objects.

### Clean Project File Matrix
```text
doctor-day-plan/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── mern_feature_orchestration.md  # Master Prompt Issue Configuration
│   ├── workflows/
│   │   └── ci-validation.yml              # Automated GitHub CI Pipeline
│   └── copilot-instructions.md            # AI Architectural Guardrails
├── docs/
│   └── prompts/
│       └── copilot-library.md             # Context Isolated Prompt Playbook
├── backend/               <-- Isolated Backend Workspace Folder
│   ├── config/            # Database configurations
│   ├── controllers/       # Business Logic Layer
│   ├── middleware/        # Auth & Guard Middleware
│   ├── models/            # Mongoose Relational Schemas
│   ├── routes/            # Express Endpoint Mapping
│   ├── utils/             # Math, Logic & Streaming Helpers
│   ├── __tests__/         # Automated Testing Specs
│   ├── .env               # Secret System Keys & Port Parameters
│   ├── package.json       # Contains express, mongoose, bcrypt, etc.
│   └── server.js          # Node Entry Point Core File
├── frontend/              <-- Isolated Frontend Workspace Folder
│   ├── src/
│   │   ├── api/           # Network Interceptors & Services
│   │   ├── components/    # Functional UI Layer
│   │   ├── context/       # Live Socket/State Engines
│   │   └── index.css      # Core Tailwind CSS Imports
│   ├── package.json       # Contains react, vite, axios, etc.
│   └── vite.config.js     # React UI Platform Configurations
├── Dockerfile             # Multi-Stage Image Orchestrator
├── .gitignore             # Repository Tracking Exclusions
└── package.json           # Root Orchestrator (Only concurrently & nodemon)
```

---

## 🛠️ Step-by-Step Local Development Guide

Follow these exact operational procedures to spin up your local full-stack studio workspace from an absolute blank slate.

### 1. Project Initialization & Folder Scaffolding
Run this terminal sequence to instantly layout the directory architecture tree structure:
```bash
mkdir doctor-day-plan && cd doctor-day-plan
npm init -y
mkdir -p backend/config backend/controllers backend/middleware backend/models backend/routes backend/utils backend/__tests__ public
npm create vite@latest frontend -- --template react
mkdir -p docs/prompts .github/ISSUE_TEMPLATE .github/workflows
```

### 2. Dependency Matrix Installation
Install the core runtime platforms, testing suites, and development tooling inside the respective workspace paths:

```bash
# A. Install orchestration tools in the project ROOT
npm install --save-dev concurrently nodemon

# B. Isolate and install backend modules
cd backend && npm init -y
npm install express mongoose dotenv jsonwebtoken bcrypt socket.io pdfkit cors
npm install --save-dev jest supertest mongodb-memory-server
cd ..

# C. Isolate and install frontend modules
cd frontend
npm install axios react-router-dom socket.io-client
npm install tailwindcss @tailwindcss/vite
cd ..
```

### 3. Modern Tailwind CSS v4 Configuration
Because Tailwind CSS v4 removes the legacy `npx tailwindcss init -p` config utility, it compiles natively using direct Vite integrations.

Open `frontend/vite.config.js` and register the plugin exactly like this:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcssPlugin from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcssPlugin(),
  ],
})
```

Open `frontend/src/index.css` and completely clear out any pre-existing code. Paste this single clean modern import vector directive:
```css
@import "tailwindcss";
```

### 4. Create the Environment File
Create a `.env` file inside your **`backend/`** folder to securely handle parameters locally:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/doctordayplan
JWT_SECRET=super_secret_healthcare_signing_token_change_in_production
```

### 5. Setup the Primary App Server (`backend/server.js`)
Create your backend entry point at `backend/server.js` with this baseline production boilerplate:
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'DoctorDayPlan API engine is executing safely.' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server executing safely on port: ${PORT}`));
```

### 6. Root Automation Scripts
Open the **root directory's** `package.json` file and overwrite its scripts block to cleanly coordinate directory transitions:
```json
"scripts": {
  "backend": "cd backend && nodemon server.js",
  "frontend": "cd frontend && npm run dev",
  "dev": "concurrently \"npm run backend\" \"npm run frontend\"",
  "test": "cd backend && jest --runInBand --detectOpenHandles"
}
```

### 7. Executing Your Workspace Studio
Open your primary root directory terminal and launch the entire live hot-reloading development server grid with a single command:
```bash
npm run dev
```

To run your backend business logic unit tests, execute:
```bash
npm run test
```

---

## 🤖 AI Workspace Automation Instructions
This project contains deep system files tailored specifically for GitHub Copilot Workspace and multi-agent IDE structures (Cursor Composer, Roo Code, Cline).

* **Enforcing Rules:** Global instructions reside in `.github/copilot-instructions.md`. It forces budget models to use secure parameters, stream raw files cleanly, and execute zero-placeholder code patterns.
* **Adding Modules:** When building a new feature, open a **New GitHub Issue** and select the **MERN Feature Agent Orchestration** template. Launch the task in Copilot Workspace to automate the entire multi-file code loop.
