# DoctorDayPlan v1.1 🩺

DoctorDayPlan is a doctor-centric practice management platform designed for independent doctors operating one or more clinics. The application digitizes the daily workflow of a doctor's practice by replacing manual appointment registers, paper prescriptions, and heavy dependency on front-desk staff for routine scheduling tasks.

---

## 🚀 Key System Features
* **Role-Based Workspaces:** Streamlined pipelines customized for Doctors (Primary User) and Patients (Secondary User).
* **Automated Slot Engine:** Dynamic generation of available consultation windows based on complex weekly clinical rule parameters.
* **Real-Time Live Queue:** Seamless WebSocket state synchronization utilizing Socket.io to stream real-time queue positions and wait times.
* **Digital Prescription Desk:** Integrated server-side compilation streaming professional PDF documents instantly on-demand using PDFKit.
* **New in v1.1:** Forgot/reset password flow, mandatory doctor license verification with a patient-facing doctor profile view, diagnosis/illness patient search, one-click Excel exports (SheetJS), server-side pagination on all large lists, closed-clinic visibility in booking, fully validated forms with labels and hints, and a mobile-responsive UI.
* **Latest refinements:** bookings views pinned with a highlighted **Today's Bookings** panel grouped by clinic (both roles), collapsible hamburger navigation on mobile, and first/last page controls in pagination.

---

## 🏗️ Architecture & Stack Blueprint
* **Frontend UI:** React.js, React Router v6+, Tailwind CSS v4, Axios, Socket.io-client, SheetJS `xlsx` (Excel export).
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
│   │   ├── authController.js        # register/login, forgot+reset password, profile, public doctor profile
│   │   ├── clinicController.js      # clinics, schedules, slots, monthly availability (validated)
│   │   ├── appointmentController.js # booking (closed-clinic + date guards), status, check-in, paginated lists
│   │   └── consultationController.js# consultation records, diagnosis search, paginated history, PDF downloads
│   ├── middleware/
│   │   └── authMiddleware.js        # verifyToken, requireRole
│   ├── models/
│   │   ├── User.js                  # role enum + embedded doctorProfile (licenseNumber, unique) /patientProfile + reset-token fields
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
│   │   ├── validators.js            # shared server-side input validators + pagination helpers
│   │   ├── seedData.js              # dummy data + bulk mock records (`npm run seed`)
│   │   └── migrateLicenseNumbers.js # one-time license backfill (`npm run migrate`)
│   ├── __tests__/         # Automated Testing Specs
│   ├── .env               # Secret System Keys & Port Parameters
│   ├── package.json       # Contains express, mongoose, bcrypt, etc.
│   └── server.js          # Express + native HTTP server + Socket.io entry point
├── frontend/              <-- Isolated Frontend Workspace Folder
│   ├── src/
│   │   ├── api/
│   │   │   ├── axiosInstance.js     # Bearer token + 401/500 response interceptors
│   │   │   ├── authService.js       # login, register, forgot/reset password, profile, public doctor profile, logout
│   │   │   ├── clinicService.js     # createClinic, fetchAllClinics, fetchDoctorClinics, setUnavailableDate, fetchAvailableSlots
│   │   │   ├── appointmentService.js # booking, status, paginated history, check-in
│   │   │   └── consultationService.js# consultation CRUD, paginated history, diagnosis search, blob PDF downloads
│   │   ├── components/
│   │   │   ├── Login.jsx (with Forgot Password) / Register.jsx / ProtectedRoute.jsx
│   │   │   ├── DoctorDashboard.jsx / PatientDashboard.jsx
│   │   │   ├── ClinicManager.jsx / Calendar.jsx / SlotSelector.jsx / AppointmentList.jsx
│   │   │   ├── LiveQueue.jsx / ConsultationWorkspace.jsx
│   │   │   ├── MedicalHistory.jsx / PatientRecords.jsx / ProfilePanel.jsx
│   │   │   ├── Pagination.jsx       # shared server-side pagination controls
│   │   │   └── DoctorProfileModal.jsx# patient-facing doctor credentials + license view
│   │   ├── context/
│   │   │   └── QueueContext.jsx    # shared Socket.io state provider
│   │   ├── hooks/
│   │   │   └── useLiveQueue.js     # queue command wrappers
│   │   ├── utils/
│   │   │   └── exportExcel.js      # SheetJS xlsx export helpers
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
npm install axios react-router-dom socket.io-client xlsx
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
  "test": "cd backend && jest --runInBand --detectOpenHandles",
  "seed": "cd backend && node utils/seedData.js",
  "migrate": "cd backend && node utils/migrateLicenseNumbers.js"
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

To seed the local database with test accounts, clinics, and bulk mock records (≥1000 appointments per test doctor, ≥100 per test patient) — safe to re-run:
```bash
npm run seed
```

To backfill mandatory license numbers onto doctor accounts created before v1.1 (assigns unique `PENDING-XXXXXX` placeholders; safe to re-run):
```bash
npm run migrate
```

To run your backend business logic unit tests, execute:
```bash
npm run test
```

---

## ✅ Implemented Functionality (Modules 1–5 + v1.1 enhancements)

### Module 1 — Authentication & Access
* Patient self-registration (`POST /api/auth/register`) and doctor self-registration (`POST /api/auth/register/doctor`); passwords are hashed via a `bcrypt` pre-save hook on the `User` model (never stored in plaintext).
* **Doctor license is mandatory:** doctor registration and profile updates require `doctorProfile.licenseNumber` matching `/^[A-Za-z0-9\-/]{5,20}$/`, kept unique by a sparse index. Patients can verify a doctor's license, specialization, qualification, and experience from the booking flow via `GET /api/auth/doctors/:doctorId`.
* **Forgot password:** `POST /api/auth/forgot-password` stores a sha256-hashed, 15-minute reset token on the user and answers generically (no account enumeration); `POST /api/auth/reset-password` consumes it once. Outside production the token is returned in the response because no email service is configured.
* JWT login (`POST /api/auth/login`) issuing a 7-day token containing `{ userId, role }`.
* `verifyToken` / `requireRole` Express middleware protecting all doctor-only and patient-only routes.
* `Login.jsx` (with the forgot/reset flow) and `Register.jsx` (with a Patient/Doctor toggle) wired through `react-router-dom`; the JWT's `role` claim decides whether a user lands on `/doctor/dashboard` or `/patient/dashboard`, enforced client-side by `ProtectedRoute.jsx`.
* All registration/profile fields are validated on both sides: HTML5 attributes plus friendly errors in React, and `backend/utils/validators.js` helpers (email, phone, password strength, license format, date sanity) on the server.

### Module 2 — Practice Management (Clinics)
* Doctors create clinics with weekly `scheduleRules` (`POST /api/clinics`), list their own clinics (`GET /api/clinics/my-clinics`), update clinic details/schedules/status (`PATCH /api/clinics/:clinicId`), and deactivate clinics (`DELETE /api/clinics/:clinicId`). Deactivation is a reversible soft action that sets the clinic to `inactive`, stops new bookings, preserves historical references, and can be reversed through the edit form by setting status back to `active`.
* Patients (and doctors) browse all active clinics with doctor details populated (`GET /api/clinics`) and fetch generated available time slots for a chosen date (`GET /api/clinics/:clinicId/slots`).
* `ClinicManager.jsx` handles doctor-side clinic create/edit/deactivate actions, weekly schedule-row management, active/inactive status changes, and the unavailable-date form; the Patient Dashboard offers a clinic dropdown (name, address, doctor) feeding into `SlotSelector.jsx`.
* Patients select a clinic and use a month calendar. The calendar highlights dates with configured clinic hours in green and unavailable/non-operating dates in red. Clicking an available date immediately loads its slots; there is no separate "Find Slots" button.
* The selected-date slot response includes `slots` (selectable times), `allSlots` (the complete schedule), and `bookedSlots` (times occupied by active appointments). The UI keeps booked times visible but disabled.
* The Patient Dashboard is split into **Book Appointment** and **My Medical History** tabs. Booking, live queue status, and appointment history stay in the booking tab, while diagnoses, notes, medicines, and prescription downloads are available in the medical-history tab.
* Clinic booking is city-first: patients choose from major Indian cities, and the clinic dropdown appears only after a city is selected. The list shows every clinic in that city — **closed (inactive) clinics stay visible as disabled options marked "Closed"**, and the server rejects booking attempts against them with 400. The current city list includes Ahmedabad, Amritsar, Bengaluru, Bhopal, Bhubaneswar, Chandigarh, Chennai, Coimbatore, Dehradun, Delhi, Gurugram, Guwahati, Hyderabad, Indore, Jaipur, Jammu, Kanpur, Kochi, Kolkata, Lucknow, Ludhiana, Mumbai, Mysuru, Nagpur, Nashik, Noida, Patna, Pune, Rajkot, Ranchi, Surat, Thiruvananthapuram, Vadodara, Varanasi, Vijayawada, and Visakhapatnam.

### Module 3 — Appointment Management
* Patients book slots (`POST /api/appointments`); double-booking is blocked at the database level via a compound unique index on `[clinicId, appointmentDate, slotTime]`.
* Doctors accept/reject appointments and patients cancel with a reason (`PATCH /api/appointments/:id/status`); patients can check in (`PATCH /api/appointments/:id/checkin`).
* Doctors can view today's appointments (`GET /api/appointments/today`) or all current/future appointments (`GET /api/appointments/upcoming`); patients view their own booking history (`GET /api/appointments/my`). **All three list endpoints are paginated** — they return `{ data, pagination: { total, page, limit, totalPages } }` and accept `page`/`limit` (default 1/10, max 100) or `all=true` (server-capped at 5000) for exports.
* **Grouped booking views:** both the doctor's Appointments tab and the patient's My Bookings tab open with a highlighted **Today's Bookings** panel grouped by clinic, followed by collapsible per-date groups — the doctor's dates are subgrouped by clinic as well. A shared `AppointmentCard` component renders every row, so role-specific actions stay identical across views.
* Doctors can export all upcoming appointments to a real `.xlsx` workbook in one click (`AppointmentList.jsx` → SheetJS `xlsx` via `frontend/src/utils/exportExcel.js`).
* `AppointmentList.jsx` renders both role-specific views. A doctor can open a confirmed appointment in the consultation workspace.
* `pending`, `confirmed`, and `completed` appointments reserve a clinic/date/time slot. `cancelled` and `rejected` appointments release that slot, and the Patient Dashboard refreshes availability after booking or cancellation.
* Doctors can trigger an emergency cancellation (`POST /api/appointments/emergency`). After confirmation, only today's pending and confirmed appointments are cancelled with the doctor's message, affected patients receive a Socket.io `doctorEmergency` notice, and cancelled patients are removed from live queues. Future, completed, rejected, and already-cancelled appointments are preserved.
* Normal accept, reject, cancel, reschedule, call, and consultation-finished actions emit `appointmentUpdated` notices to the affected user's Socket.io room.

### Module 4 — Live Queue & Real-Time Updates
* Socket.io uses the same HTTP server as Express. Queue ordering is maintained per clinic room and synchronized with appointment records in MongoDB.
* Supported events: `joinQueueRoom`, `callNextPatient`, `skipPatient`, and `consultationFinished`.
* A successful patient check-in adds the appointment to its clinic queue and broadcasts the update. Queue payloads contain `currentPatient`, `waitingQueueArray`, and `estimatedWaitTime`.
* Doctors use the **Live Queue** dashboard tab to select a clinic, call the next patient, skip a patient, or finish the active consultation. Calling a patient persists `inConsultation`; finishing persists `completed`; checked-in queues recover from MongoDB after restart. Patients with a checked-in appointment see their live position and estimated wait time.
* Frontend socket state is isolated in `QueueContext.jsx` and commands are exposed through `useLiveQueue.js`; socket listeners are removed on cleanup.

### Module 5 — Consultation & Medical Records
* Doctors create one consultation per appointment (`POST /api/consultations`), recording `diagnosis`, `clinicalNotes`, and embedded prescription lines (`name`, `dosage`, `durationDays`, `instructions`). The related appointment is marked `completed`.
* Patients can view their own history and doctors can view history for patients they have treated (`GET /api/consultations/patient/:patientId`, paginated; `all=true` for export). Both doctor and patient history views offer **Export to Excel** for the full record set.
* Doctors can search patients associated with their appointments by name, email, phone, **or past diagnosis/illness** (`GET /api/consultations/search?query=...`). The search is doctor-only, returns only that doctor's known patients, and includes a `matchedDiagnoses` list for diagnosis hits.
* Authorized doctors and patients can download prescriptions (`GET /api/consultations/:id/download`). PDFKit streams the PDF directly to the Express response; no PDF is saved to application disk. The frontend verifies the `application/pdf` content type before saving and surfaces server errors instead of saving broken files.
* **Download authorization mirrors history authorization:** any doctor who has treated a patient can download prescriptions from that patient's history — including ones authored by another doctor — while unrelated doctors are still rejected with 403.
* `ConsultationWorkspace.jsx` provides the diagnosis form, dynamic medicine rows, history timeline, and PDF download controls. `MedicalHistory.jsx` exposes diagnoses, clinical notes, prescribed medicines, and PDF downloads to patients. `PatientRecords.jsx` provides the doctor search workflow. `consultationService.js` handles JSON requests and browser blob downloads.
* Consultation creation derives patient, doctor, and clinic relationships from the appointment rather than trusting client-supplied IDs, and saves the consultation plus appointment completion inside a MongoDB transaction.

### UI / UX Standards (v1.1)
* Every form input, select, and textarea has an associated `<label htmlFor>` and, where it aids entry, an example placeholder and hint text (e.g. `e.g. MCI-12345`, `e.g. +919876543210`, `Try a name (e.g. Rahul), email, phone, or illness (e.g. diabetes, migraine)`).
* The interface is mobile-responsive: below 768px both dashboards switch to a **collapsible hamburger menu** (tabs, SOS, and Logout fold into an animated dropdown); the booking grid collapses to a single column, tables scroll horizontally, 16px inputs prevent iOS zoom-on-focus, and pagination centers on small screens.
* Large lists render shared `<Pagination />` controls (`Page x of y · n records` plus **First / Prev / numbered / Next / Last** buttons) backed by the server-side envelope.

### Verification Status
* The frontend production build passes with Vite, and the full ESLint run reports **0 errors / 0 warnings**.
* Backend integration tests cover patient registration/password hashing/JWT login, inactive-account rejection, duplicate appointment-slot prevention, profile/clinic schedule updates, reschedule conflict handling, **doctor license enforcement + uniqueness, weak-password/phone rejection, the full forgot/reset password cycle (including token reuse), diagnosis-based patient search, the pagination envelope, closed-clinic booking rejection, public doctor profile exposure, cross-doctor prescription download authorization (allowed for treating doctors, 403 for strangers), and PDF streaming verified down to the `%PDF` magic bytes**. Run them from `backend/` with `npm.cmd test` (or `npm run test` from the root).
* The backend test suite currently contains 2 suites and **18 passing tests**, including dedicated live-queue unit tests for deduplication, MongoDB hydration, current-patient recovery, and queue cleanup.
* Mongoose 9 update operations use `returnDocument: 'after'` instead of the deprecated `new: true` option, so the backend starts without those deprecation warnings.

### High-Priority Completion Notes
* Authenticated profile read/update endpoints are available at `GET/PATCH /api/auth/profile`; doctor profiles include editable slot duration and average consultation duration, and inactive accounts cannot log in.
* Doctors can reschedule pending or confirmed appointments with `PATCH /api/appointments/:id/reschedule`; conflicts are rejected and patient cancellation is limited to appointments that have not yet been confirmed.
* Live queues recover checked-in confirmed and `inConsultation` appointments from MongoDB when a clinic room is joined, persist call/finish transitions, and repeated check-in requests do not create duplicate queue entries.
* Normal appointment lifecycle changes emit `appointmentUpdated` notices to affected user rooms; emergency cancellations emit `doctorEmergency` notices.

> **Current queue limitation:** live queue state is intentionally in memory. Restarting the backend clears active queue state, while appointment and consultation records remain in MongoDB. Individual day slots now reflect active `pending`, `confirmed`, and `completed` appointments as disabled; `cancelled` and `rejected` appointments release their slot and make it available again after the selected date is refreshed.

### CI Validation
The GitHub Actions workflow at `.github/workflows/ci-validation.yml` validates the two workspaces independently on pushes and pull requests to `main` and `develop:
* Backend job: uses Node.js 24, installs from `backend/package-lock.json`, and runs `npm test` from `backend/`.
* Frontend job: uses Node.js 24, installs from `frontend/package-lock.json`, and runs the Vite production build from `frontend/`.

---

## 🔑 Test Accounts & Seed Data

Populate your local database with sample doctors, patients, clinics, appointments, medicines, consultation history, **and bulk mock records (≥1000 per doctor, ≥100 per named test patient)** for exercising pagination, search, and Excel export. Safe to re-run — it deletes and re-creates matching records each time, and **adopts orphaned clinics**: any pre-existing clinic whose owning doctor was replaced by re-seeding is automatically re-pointed at the replacement doctor (matched by specialization), so manually created clinics never break.
```bash
npm run seed
```

| Role    | Email                          | Password    | Notes                                    |
|---------|---------------------------------|-------------|-------------------------------------------|
| Doctor  | `dr.priya@doctordayplan.test`   | `Doctor@123`| Cardiology, license `MCI-10001` — owns 2 clinics (Bengaluru)    |
| Doctor  | `dr.arjun@doctordayplan.test`   | `Doctor@123`| Dermatology, license `MCI-10002` — owns 2 clinics (Kolkata/Pune) |
| Patient | `patient1@doctordayplan.test`   | `Patient@123`| Rahul Verma                               |
| Patient | `patient2@doctordayplan.test`   | `Patient@123`| Sneha Kapoor                              |
| Patient | `mock.patient.1..40@doctordayplan.test` | `Patient@123` | 40 bulk mock patients for volume testing |

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
