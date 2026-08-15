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
│   ├── config/
│   │   └── db.js                    # Mongoose connection + event listeners
│   ├── controllers/
│   │   ├── authController.js        # registerPatient, registerDoctor, loginUser
│   │   ├── clinicController.js      # clinics, schedules, slots, monthly availability
│   │   ├── appointmentController.js # booking, status, check-in, today/upcoming lists
│   │   └── consultationController.js# consultation records, history, PDF downloads
│   ├── middleware/
│   │   └── authMiddleware.js        # verifyToken, requireRole
│   ├── models/
│   │   ├── User.js                  # role enum + embedded doctorProfile/patientProfile
│   │   ├── Clinic.js                # doctorId FK + scheduleRules
│   │   ├── Appointment.js           # clinicId/doctorId/patientId FKs + status enum
│   │   ├── Consultation.js          # diagnosis, clinical notes, embedded prescriptions
│   │   └── Medicine.js              # medicine catalog schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── clinicRoutes.js
│   │   ├── appointmentRoutes.js
│   │   └── consultationRoutes.js
│   ├── sockets/
│   │   ├── ioInstance.js            # shared Socket.io instance for REST/socket coordination
│   │   └── queueHandler.js           # per-clinic in-memory live queue events
│   ├── utils/
│   │   ├── prescriptionGenerator.js # direct PDFKit-to-Express streaming
│   │   └── seedData.js              # dummy doctor/patient/clinic seed script (`npm run seed`)
│   ├── __tests__/         # Automated Testing Specs
│   ├── .env               # Secret System Keys & Port Parameters
│   ├── package.json       # Contains express, mongoose, bcrypt, etc.
│   └── server.js          # Express + native HTTP server + Socket.io entry point
├── frontend/              <-- Isolated Frontend Workspace Folder
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.js     # Bearer token + 401/500 response interceptors
│   │   │   ├── authService.js       # login, register, registerDoctor, logout
│   │   │   ├── clinicService.js     # createClinic, fetchAllClinics, fetchDoctorClinics, setUnavailableDate, fetchAvailableSlots
│   │   │   ├── appointmentService.js # booking, status, history, check-in
│   │   │   └── consultationService.js# consultation CRUD, history, blob PDF downloads
│   │   ├── components/
│   │   │   ├── Login.jsx / Register.jsx / ProtectedRoute.jsx
│   │   │   ├── DoctorDashboard.jsx / PatientDashboard.jsx
│   │   │   ├── ClinicManager.jsx / Calendar.jsx / SlotSelector.jsx / AppointmentList.jsx
│   │   │   ├── LiveQueue.jsx / ConsultationWorkspace.jsx
│   │   │   └── MedicalHistory.jsx / PatientRecords.jsx
│   │   ├── context/
│   │   │   └── QueueContext.jsx    # shared Socket.io state provider
│   │   ├── hooks/
│   │   │   └── useLiveQueue.js     # queue command wrappers
│   │   ├── App.jsx                  # react-router-dom routes + role-based guarding
│   │   └── index.css                # Core Tailwind CSS Imports
│   ├── .env                # VITE_API_URL, VITE_SOCKET_URL (Vite project — NOT Create React App)
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

### 4. Create the Environment Files
Create a `.env` file inside your **`backend/`** folder to securely handle parameters locally:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/doctordayplan
JWT_SECRET=super_secret_healthcare_signing_token_change_in_production
```

Create a separate `.env` file inside your **`frontend/`** folder. Because the frontend is a **Vite** project (not Create React App), environment variables must be prefixed with `VITE_` and are read via `import.meta.env`, not `process.env.REACT_APP_*`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 5. Backend Server and Real-Time Gateway
The current `backend/server.js` wraps Express in a native HTTP server and attaches Socket.io to the same port. It mounts the authentication, clinic, appointment, and consultation routers, then initializes the live queue handler.

The server starts on port `5000` by default:
```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'DoctorDayPlan API engine is executing safely.' });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clinics', require('./routes/clinicRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/consultations', require('./routes/consultationRoutes'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server executing safely on port: ${PORT}`));
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

On PowerShell installations where `npm.ps1` is blocked by the execution policy, use the Windows command shim:
```bash
npm.cmd run dev
```

To seed the local database from the backend directory:
```bash
cd backend
npm.cmd run seed
```

To run your backend business logic unit tests, execute:
```bash
npm run test
```

---

## ✅ Implemented Functionality (Modules 1–5)

### Module 1 — Authentication & Access
* Patient self-registration (`POST /api/auth/register`) and doctor self-registration (`POST /api/auth/register/doctor`); passwords are hashed via a `bcrypt` pre-save hook on the `User` model (never stored in plaintext).
* JWT login (`POST /api/auth/login`) issuing a 7-day token containing `{ userId, role }`.
* `verifyToken` / `requireRole` Express middleware protecting all doctor-only and patient-only routes.
* `Login.jsx` and `Register.jsx` (with a Patient/Doctor toggle) wired through `react-router-dom`; the JWT's `role` claim decides whether a user lands on `/doctor/dashboard` or `/patient/dashboard`, enforced client-side by `ProtectedRoute.jsx`.

### Module 2 — Practice Management (Clinics)
* Doctors create clinics with weekly `scheduleRules` (`POST /api/clinics`), list their own clinics (`GET /api/clinics/my-clinics`), update clinic details/schedules/status (`PATCH /api/clinics/:clinicId`), and deactivate clinics (`DELETE /api/clinics/:clinicId`). Deactivation is a reversible soft action that sets the clinic to `inactive`, stops new bookings, preserves historical references, and can be reversed through the edit form by setting status back to `active`.
* Patients (and doctors) browse all active clinics with doctor details populated (`GET /api/clinics`) and fetch generated available time slots for a chosen date (`GET /api/clinics/:clinicId/slots`).
* `ClinicManager.jsx` handles doctor-side clinic create/edit/deactivate actions, weekly schedule-row management, active/inactive status changes, and the unavailable-date form; the Patient Dashboard offers a clinic dropdown (name, address, doctor) feeding into `SlotSelector.jsx`.
* Patients select a clinic and use a month calendar. The calendar highlights dates with configured clinic hours in green and unavailable/non-operating dates in red. Clicking an available date immediately loads its slots; there is no separate "Find Slots" button.
* The selected-date slot response includes `slots` (selectable times), `allSlots` (the complete schedule), and `bookedSlots` (times occupied by active appointments). The UI keeps booked times visible but disabled.
* The Patient Dashboard is split into **Book Appointment** and **My Medical History** tabs. Booking, live queue status, and appointment history stay in the booking tab, while diagnoses, notes, medicines, and prescription downloads are available in the medical-history tab.
* Clinic booking is city-first: patients choose from major Indian cities, then see only clinics whose address belongs to that city. The current city list includes Ahmedabad, Amritsar, Bengaluru, Bhopal, Bhubaneswar, Chandigarh, Chennai, Coimbatore, Dehradun, Delhi, Gurugram, Guwahati, Hyderabad, Indore, Jaipur, Jammu, Kanpur, Kochi, Kolkata, Lucknow, Ludhiana, Mumbai, Mysuru, Nagpur, Nashik, Noida, Patna, Pune, Rajkot, Ranchi, Surat, Thiruvananthapuram, Vadodara, Varanasi, Vijayawada, and Visakhapatnam.

### Module 3 — Appointment Management
* Patients book slots (`POST /api/appointments`); double-booking is blocked at the database level via a compound unique index on `[clinicId, appointmentDate, slotTime]`.
* Doctors accept/reject appointments and patients cancel with a reason (`PATCH /api/appointments/:id/status`); patients can check in (`PATCH /api/appointments/:id/checkin`).
* Doctors can view today's appointments (`GET /api/appointments/today`) or all current/future appointments (`GET /api/appointments/upcoming`); patients view their own booking history (`GET /api/appointments/my`).
* `AppointmentList.jsx` renders both role-specific views. A doctor can open a confirmed appointment in the consultation workspace.
* `pending`, `confirmed`, and `completed` appointments reserve a clinic/date/time slot. `cancelled` and `rejected` appointments release that slot, and the Patient Dashboard refreshes availability after booking or cancellation.
* Doctors can trigger an emergency cancellation (`POST /api/appointments/emergency`). After confirmation, only today's pending and confirmed appointments are cancelled with the doctor's message, affected patients receive a Socket.io `doctorEmergency` notice, and cancelled patients are removed from live queues. Future, completed, rejected, and already-cancelled appointments are preserved.

### Module 4 — Live Queue & Real-Time Updates
* Socket.io uses the same HTTP server as Express. Queue state is maintained in memory per clinic room and is broadcast through `queueUpdated`.
* Supported events: `joinQueueRoom`, `callNextPatient`, `skipPatient`, and `consultationFinished`.
* A successful patient check-in adds the appointment to its clinic queue and broadcasts the update. Queue payloads contain `currentPatient`, `waitingQueueArray`, and `estimatedWaitTime`.
* Doctors use the **Live Queue** dashboard tab to select a clinic, call the next patient, skip a patient, or finish the active consultation. Patients with a checked-in appointment see their live position and estimated wait time.
* Frontend socket state is isolated in `QueueContext.jsx` and commands are exposed through `useLiveQueue.js`; socket listeners are removed on cleanup.

### Module 5 — Consultation & Medical Records
* Doctors create one consultation per appointment (`POST /api/consultations`), recording `diagnosis`, `clinicalNotes`, and embedded prescription lines (`name`, `dosage`, `durationDays`, `instructions`). The related appointment is marked `completed`.
* Patients can view their own history and doctors can view history for patients they have treated (`GET /api/consultations/patient/:patientId`).
* Doctors can search patients associated with their appointments by name, email, or phone (`GET /api/consultations/search?query=...`). The search is doctor-only and returns only that doctor's known patients.
* Authorized doctors and patients can download prescriptions (`GET /api/consultations/:id/download`). PDFKit streams the PDF directly to the Express response; no PDF is saved to application disk.
* `ConsultationWorkspace.jsx` provides the diagnosis form, dynamic medicine rows, history timeline, and PDF download controls. `MedicalHistory.jsx` exposes diagnoses, clinical notes, prescribed medicines, and PDF downloads to patients. `PatientRecords.jsx` provides the doctor search workflow. `consultationService.js` handles JSON requests and browser blob downloads.
* Consultation creation derives patient, doctor, and clinic relationships from the appointment rather than trusting client-supplied IDs, and saves the consultation plus appointment completion inside a MongoDB transaction.

### Verification Status
* The frontend production build passes with Vite.
* Focused diagnostics pass for the new patient history and records-search components.
* The full ESLint run still reports older hook/style findings in existing queue, calendar, clinic, appointment, and socket-context files; these do not prevent the production build.
* High-priority backend integration tests now cover patient registration/password hashing/JWT login, inactive-account rejection, and duplicate appointment-slot prevention. Run them from `backend/` with `npm.cmd test`.
* Mongoose 9 update operations use `returnDocument: 'after'` instead of the deprecated `new: true` option, so the backend starts without those deprecation warnings.

### High-Priority Completion Notes
* Authenticated profile read/update endpoints are available at `GET/PATCH /api/auth/profile`; doctor profiles include editable slot duration and average consultation duration, and inactive accounts cannot log in.
* Doctors can reschedule pending or confirmed appointments with `PATCH /api/appointments/:id/reschedule`; conflicts are rejected and patient cancellation is limited to appointments that have not yet been confirmed.
* Live queues recover checked-in confirmed appointments from MongoDB when a clinic room is joined, and repeated check-in requests do not create duplicate queue entries.

> **Current queue limitation:** live queue state is intentionally in memory. Restarting the backend clears active queue state, while appointment and consultation records remain in MongoDB. Individual day slots now reflect active `pending`, `confirmed`, and `completed` appointments as disabled; `cancelled` and `rejected` appointments release their slot and make it available again after the selected date is refreshed.

---

## 🔑 Test Accounts & Seed Data

Populate your local database with sample doctors, patients, clinics, appointments, medicines, and consultation history (safe to re-run — it deletes and re-creates matching records each time):
```bash
cd backend
npm run seed
```

| Role    | Email                          | Password    | Notes                                    |
|---------|---------------------------------|-------------|-------------------------------------------|
| Doctor  | `dr.priya@doctordayplan.test`   | `Doctor@123`| Cardiology — owns 2 clinics (Bengaluru)    |
| Doctor  | `dr.arjun@doctordayplan.test`   | `Doctor@123`| Dermatology — owns 2 clinics (Kolkata/Pune) |
| Patient | `patient1@doctordayplan.test`   | `Patient@123`| Rahul Verma                               |
| Patient | `patient2@doctordayplan.test`   | `Patient@123`| Sneha Kapoor                              |

Log in at `/login` with any of the above to explore the Doctor or Patient dashboard immediately without manually registering.

The seed script also creates:
* A checked-in appointment for the live queue screen.
* A pending appointment for doctor approval/rejection testing.
* Completed appointments with consultation history and prescription medicines for both patient medical-history and PDF download screens.
* A Pune appointment for city filtering, clinic selection, and second-patient history testing.
* Cancelled and rejected appointments for status badges, cancellation reasons, and slot-release testing.
* Medicine catalog entries for Atorvastatin 10, Cetirizine 10, and Pantoprazole 40.
* Pune test clinic: **Pune Wellness Centre**, 21 FC Road, Pune, Maharashtra, owned by Dr. Arjun Mehta.

---

## 🤖 AI Workspace Automation Instructions
This project contains deep system files tailored specifically for GitHub Copilot Workspace and multi-agent IDE structures (Cursor Composer, Roo Code, Cline).

* **Enforcing Rules:** Global instructions reside in `.github/copilot-instructions.md`. It forces budget models to use secure parameters, stream raw files cleanly, and execute zero-placeholder code patterns.
* **Adding Modules:** When building a new feature, open a **New GitHub Issue** and select the **MERN Feature Agent Orchestration** template. Launch the task in Copilot Workspace to automate the entire multi-file code loop.
