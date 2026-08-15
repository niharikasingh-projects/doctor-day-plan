# DoctorDayPlan v1.0 - Copilot Prompt Library

This file contains optimized, isolated prompts designed for budget-friendly AI models (like Gemini Flash or GPT o4-mini) to generate individual features step-by-step.

---
## 🔐 Master Prompt

Role: Lead MERN Stack Architect and Senior MongoDB Engineer.
Context: I am building a practice management platform called 'DoctorDayPlan v1.0' using React, Node.js, Express, MongoDB (Mongoose), Socket.io, and PDFKit.

Task: Generate the complete Backend Architecture, Folder Structure, and Mongoose Schema files exactly mapping the provided requirements, ER diagram entities, and Data Dictionary rules.

Requirements to enforce:
1. One-to-Many Relationships: 
   - One Clinic can have Many Appointments.
   - One Doctor (User) can own Many Clinics.
   - One User (Patient) can book Many Appointments.
2. Embedding vs. Referencing:
   - Implement role-based separation using MongoDB Embedded Objects (doctorProfile and patientProfile inside the User collection) as defined in the data dictionary.
   - Separate collection references using ObjectId for Clinic, Appointment, Consultation, and Medicine.
3. Strict Schema Validation: Include correct data types, enums, required fields, and auto-timestamps.

Execute the following steps explicitly:

### STEP 1: WORKSPACE ARCHITECTURE
Output a clean text-based MERN stack project folder structure layout separating frontend, backend, models, controllers, routes, and config directories.

### STEP 2: COMPLETE DATABASE CONFIGURATION
Provide the production-ready database connection script (`config/db.js`) using mongoose.connect() with standard connection event listeners.

### STEP 3: ALL MONGOOSE SCHEMAS (Production-Ready Code)
Provide the full, clean, standalone JavaScript code files for the following Mongoose models:
1. `models/User.js` (Include role enum, bcrypt hashing pre-save hook, and embedded doctorProfile/patientProfile schemas).
2. `models/Clinic.js` (Include doctorId FK reference and the scheduleRules structure array).
3. `models/Appointment.js` (Include fields matching the ER Diagram: slotTime, doctorId, patientId, clinicId, checkedInAt, and appointment status enums).
4. `models/Consultation.js` (Include appointmentId, patientId, doctorId, diagnosis, symptoms text, and an embedded array/reference for medicines).
5. `models/Medicine.js` (Include medicineId, name, and category).

Output Format: Provide raw, complete, block-scoped code per file with zero truncated lines or placeholders so I can copy-paste them directly into my workspace. Do not include verbose written explanations between files.

---

## 🔐 Module 1 & 2: Auth & Practice Management
Use this prompt in Copilot Chat to generate the baseline Axios instances and authentication API calls:

Role: Senior Frontend Engineer and React Architecture Expert.
Context: I am building the client side of 'DoctorDayPlan v1.0' using React (functional components), Axios, and Tailwind CSS. The backend expects a JWT in the Authorization header for protected routes.

Task: Create a modular, organized Axios instance and complete API client services for Module 1 (Authentication) and Module 2 (Practice Management).

Requirements to enforce:
1. Base Configuration: Intercept requests to automatically attach the token from localStorage (`Bearer <token>`).
2. Global Error Handling: Intercept responses to handle 401 (unauthorized) and 500 errors gracefully.
3. Strict MERN Mapping: Endpoints must align perfectly with the User and Clinic data structures (including embedded doctorProfile/patientProfile fields).

Execute the following steps explicitly:

### STEP 1: API CLIENT INSTANCE (`src/api/axiosInstance.js`)
Generate a central Axios configuration file setup with:
- `baseURL` sourced from an environment variable (`process.env.REACT_APP_API_URL`).
- Request interceptor checking `localStorage.getItem('token')`.
- Response interceptor rejected promise forwarding for component-level UI error states.

### STEP 2: AUTHENTICATION SERVICE (`src/api/authService.js`)
Generate API calls with clean request payloads and TypeScript-style clean JS parameters for:
- Login (email, password) -> Stores token and role on success.
- Patient Registration (email, password, phone, patientProfile: { name, dob, gender }).
- Get/Update User Profile (Handles conditional doctor/patient updates).

### STEP 3: PRACTICE MANAGEMENT SERVICE (`src/api/clinicService.js`)
Generate API calls for the doctor-centric features:
- Create Clinic (`name`, `address`, `contactPhone`, `scheduleRules`).
- Get Clinics by Doctor ID.
- Update Clinic Schedule Rules/Availability.
- Mark Unavailable Dates (pushes dates to the doctor profile).

Output Format: Provide complete, modular JavaScript files exporting raw functions or clean service objects. Do not include markdown comments inside code blocks or verbose text explanations between files.

========================================================================
FEATURE SPECIFICATION SHEET: MODULE 1 (AUTHENTICATION & ACCESS)
========================================================================

1. BACKEND SCHEMA SPECIFICATION
Target File Path: `backend/models/User.js`
Fields to Implement:
  - email: String (Required, Unique, Lowercase, Trimmed)
  - passwordHash: String (Required)
  - role: Enum String (Values: 'doctor', 'patient', Required)
  - phone: String (Required for patient, Optional for doctor)
  - isActive: Boolean (Default: true)
  - doctorProfile: Embedded Object (Conditional, present only if role is 'doctor')
    * name: String (Required)
    * specialization: String
    * qualification: String
    * experienceYears: Number
    * bio: String
    * defaultSlotDurationMins: Number (Default: 15)
    * avgConsultationMins: Number (Default: 15)
    * unavailableDates: Array of Objects (date: Date, reason: String)
  - patientProfile: Embedded Object (Conditional, present only if role is 'patient')
    * name: String (Required)
    * dob: Date (Required)
    * gender: Enum String (Values: 'Male', 'Female', 'Other', Required)
Constraints & Hooks to Enforce:
  - Implement a pre-save Mongoose hook: If the password field is modified, automatically hash it using `bcrypt.hash()` with 10 salt rounds before saving to `passwordHash`.
  - Automatically append standard Mongoose timestamps (createdAt, updatedAt).

2. BACKEND CONTROLLER & SECURE LOGIC
Target File Path: `backend/controllers/authController.js`
Operations to Implement:
  - `registerPatient`:
    * Accept email, password, phone, and patientProfile (name, dob, gender).
    * Check if a user with that email already exists. If yes, return a 400 response with { error: "Email is already registered." }.
    * Create a new User document setting role to 'patient', pass the raw password (let the pre-save hook hash it), save, and return a 201 status code with a success message.
  - `loginUser`:
    * Accept email and password parameters.
    * Find the user by email. If missing, return a 401 response with { error: "Invalid email or password." }.
    * Compare the raw password with `passwordHash` using `bcrypt.compare()`. If it fails, return a 401 response.
    * Generate a signed JWT token containing `{ userId: user._id, role: user.role }` using `process.env.JWT_SECRET` expiring in '7d'.
    * Return a 200 status code with `{ token, role, user: { email, id: user._id } }`.

3. EXPOSED ENDPOINTS (API ROUTES & MIDDLEWARE)
Target File Paths: `backend/routes/authRoutes.js` and `backend/middleware/authMiddleware.js`
Logic to Implement:
  - Middleware (`authMiddleware.js`): Write a `verifyToken` function that intercepts requests, extracts the JWT from the `Authorization: Bearer <token>` header, verifies it, and attaches `{ userId, role }` to `req.user`.
  - POST `/api/auth/register` -> Public -> calls `registerPatient`
  - POST `/api/auth/login` -> Public -> calls `loginUser`

4. FRONTEND SERVICE LAYER & AXIOS INTERCEPTOR
Target File Paths: `frontend/src/api/axiosInstance.js` and `frontend/src/api/authService.js`
Functions to Implement:
  - `axiosInstance.js`: Configure an Axios instance with a `baseURL` pointing to `process.env.REACT_APP_API_URL`. Add a request interceptor that reads `localStorage.getItem('token')` and appends it as a `Bearer` token to headers if present.
  - `login(email, password)` -> POSTs to `/api/auth/login`, saves the returned token and role into `localStorage`.
  - `register(payload)` -> POSTs to `/api/auth/register`.
  - `logout()` -> Purges `token` and `role` out of `localStorage`, redirecting to `/login`.

5. FRONTEND UI COMPONENTS (TAILWIND CSS & ROUTING)
Target Files: `frontend/src/components/Login.jsx`, `frontend/src/components/Register.jsx`, and `frontend/src/App.jsx`
Views to Autonomously Build:
  - `Login.jsx`: A centered layout box featuring an email input, password input, and a loading/submit button styled cleanly with Tailwind. Displays inline error messages if credentials fail.
  - `Register.jsx`: A clean form structure with state handling. Features inputs for basic fields (Email, Password, Phone) and patient-specific profile rules (Full Name, DOB, Gender selector drop-down).
  - `App.jsx`: Setup `react-router-dom` grids wrapping these views. Secure routes based on `localStorage.getItem('role')` to direct patients and doctors to their respective dashboard frames.

========================================================================
FEATURE SPECIFICATION SHEET: MODULE 2 (PRACTICE MANAGEMENT)
========================================================================

1. BACKEND SCHEMA SPECIFICATION
Target File Path: `backend/models/Clinic.js`
Fields to Implement:
  - doctorId: ObjectId (Ref: 'User', Required)
  - name: String (Required, Trimmed)
  - address: String (Required, Trimmed)
  - contactPhone: String (Optional)
  - status: Enum String (Values: 'active', 'inactive'). Default: 'active'
  - scheduleRules: Array of Objects (Weekly rule constraints configuration)
    * dayOfWeek: Enum String (Values: 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', Required)
    * startTime: String (Required, format e.g., "09:00")
    * endTime: String (Required, format e.g., "17:00")
Constraints & Indexes to Enforce:
  - Automatically append standard Mongoose timestamps (createdAt, updatedAt).
  - Ensure a single doctor can link and manage multiple Clinic records.

2. BACKEND CONTROLLER & CONFIGURATION LOGIC
Target File Path: `backend/controllers/clinicController.js`
Operations to Implement:
  - `createClinic`:
    * Accept name, address, contactPhone, and scheduleRules array.
    * Automatically map the logged-in doctor's identity (`req.user.userId`) to the `doctorId` field.
    * Save to the database and return a 201 status code.
  - `getDoctorClinics`:
    * Query the `Clinic` collection to find all documents matching the authenticated `req.user.userId`.
    * Return a 200 status code with the matching array payload.
  - `addUnavailableDate`:
    * Accept an unavailable date payload (e.g., date: "2026-12-25", reason: "Christmas Holiday").
    * Target the `User` collection by `req.user.userId` and use Mongoose `$push` operators to write the date object directly into the embedded `doctorProfile.unavailableDates` array.
  - `getAvailableSlotsForPatient`:
    * Accept parameters for `clinicId` and a target date string via headers or query parameters.
    * Step 1: Look up the target clinic's `scheduleRules` to identify if the day of the week matches active operating parameters.
    * Step 2: Query the doctor's root user file to verify that the target date is not present in the `unavailableDates` collection array.
    * Step 3: Read the doctor's `defaultSlotDurationMins`.
    * Step 4: Run a temporal generation script splitting the `startTime` to `endTime` boundaries into structural array strings. Return the list of generated raw slots to the client.

3. EXPOSED ENDPOINTS (API ROUTES)
Target File Path: `backend/routes/clinicRoutes.js`
Routes to Mount and Protect:
  - POST `/api/clinics` -> Protected (Doctor only) -> calls `createClinic`
  - GET `/api/clinics/my-clinics` -> Protected (Doctor only) -> calls `getDoctorClinics`
  - PATCH `/api/clinics/unavailable-dates` -> Protected (Doctor only) -> calls `addUnavailableDate`
  - GET `/api/clinics/:clinicId/slots` -> Protected (Doctor/Patient) -> calls `getAvailableSlotsForPatient`

4. FRONTEND SERVICE LAYER
Target File Path: `frontend/src/api/clinicService.js`
Functions to Export:
  - `createClinic(payload)` -> POSTs to `/api/clinics`
  - `fetchDoctorClinics()` -> GETs from `/api/clinics/my-clinics`
  - `setUnavailableDate(payload)` -> PATCHes to `/api/clinics/unavailable-dates`
  - `fetchAvailableSlots(clinicId, date)` -> GETs from `/api/clinics/${clinicId}/slots?date=${date}`

5. FRONTEND UI COMPONENTS (TAILWIND CSS)
Target Files: `frontend/src/components/ClinicManager.jsx` and `frontend/src/components/SlotSelector.jsx`
Views to Autonomously Build:
  - `ClinicManager.jsx`: A unified workplace dashboard view specifically for doctors.
    * Displays a list of existing clinic locations inside modern Tailwind flex-wrap grids.
    * Integrates a popup modal form allowing the doctor to append a new clinic location or define schedule block rows (Day Selector dropdown alongside Start/End Time entry fields).
    * Integrates an calendar block widget allowing the doctor to log off-duty/leave matrices that update their profile records instantly.
  - `SlotSelector.jsx`: A reusable interface component used when patients or doctors plan appointments.
    * Renders a layout grid parsing the generated available slot strings array.
    * Employs standard disabled attribute styles to visually grey-out slots or let the user click a slot block to update local feature parameters.

---
Module 3: Appointment Management

Role: Principal Full-Stack MERN Automation Agent.
Context: We are developing 'DoctorDayPlan v1.0'. You have full read/write access to this workspace. You must autonomously implement the complete backend and frontend layer for [INSERT TARGET MODULE, e.g., Module 3: Appointment Management].

Task: Autonomously write, modify, and wire up all necessary files across the backend and frontend directories to deliver this feature end-to-end. Do not use placeholders or truncated code. Write complete implementations directly to the file system.

Strict Engineering Constraints:
1. Database: Embed role profiles in the User model. Use independent collections with ObjectId referencing for all other major entities.
2. Architecture: Isolate business logic completely inside the controllers folder. UI components must stay clean by extracting network logic into services.
3. PDF Rules: If this module requires document generation, use PDFKit to stream binary files directly to the Express 'res' object. Never write PDFs to disk.
4. UI Layer: Use modern React functional components. Style exclusively using utility classes from Tailwind CSS.

Execute the following actions directly on the workspace files sequentially:

### PHASE 1: BACKEND DATA & LOGIC LAYER
1. Inspect existing files. Create the Mongoose schema file at `backend/models/[Target].js`. Enforce validation, indexes, and timestamps.
2. Create a dedicated controller file at `backend/controllers/[Target]Controller.js`. Write all required asynchronous middleware CRUD operations and business logic wrapped completely in try/catch blocks.
3. Create the route mappings at `backend/routes/[Target]Routes.js`. Wire the endpoints to the controller methods, protect them with our token verification middleware, and mount the router safely inside `backend/server.js`.

### PHASE 2: FRONTEND UI & INTEGRATION LAYER
1. Create the client-side API service file at `frontend/src/api/[Target]Service.js`. Implement clean network helper functions using our central Axios instance.
2. Create the presentation components or views inside `frontend/src/components/`. Build fully responsive, layout-friendly UI views using Tailwind CSS to display and interact with this data.
3. Mount the new components or views safely into the application route configuration inside `frontend/src/App.jsx`.

### PHASE 3: INTEGRITY VERIFICATION
1. Generate an automated mock database unit test file inside `backend/__tests__/[Target].test.js` using Jest and Supertest to verify core backend constraints.
2. Output a structured workspace diff manifest summarizing every single file you created or modified during this execution run.

========================================================================
FEATURE SPECIFICATION SHEET: MODULE 3 (APPOINTMENT MANAGEMENT)
========================================================================

1. BACKEND SCHEMA SPECIFICATION
Target File Path: `backend/models/Appointment.js`
Fields to Implement:
  - doctorId: ObjectId (Ref: 'User', Required)
  - patientId: ObjectId (Ref: 'User', Required)
  - clinicId: ObjectId (Ref: 'Clinic', Required)
  - appointmentDate: Date (Required, stores YYYY-MM-DD format)
  - slotTime: String (Required, format e.g., "10:30")
  - status: Enum String (Values: 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'). Default: 'pending'
  - checkedInAt: Date (Optional, defaults to null)
  - cancelReason: String (Optional)
Constraints to Enforce:
  - Add a compound unique index on [clinicId, appointmentDate, slotTime] to programmatically block double-bookings at the database level.
  - Automatically append standard Mongoose timestamps (createdAt, updatedAt).

2. BACKEND CONTROLLER & BUSINESS LOGIC
Target File Path: `backend/controllers/appointmentController.js`
Operations to Implement:
  - `createAppointment`: 
    * Validate that clinicId, slotTime, appointmentDate, and doctorId exist in the payload.
    * Execute a query to check for pre-existing appointments matching the exact [clinicId, appointmentDate, slotTime] profile.
    * If a match exists, instantly abort and send a 400 response with { error: "This appointment slot is already booked." }.
    * Otherwise, save the appointment with a 'pending' status and return a 201 status code.
  - `updateStatus`: 
    * Allow Doctors to transition states ('confirmed', 'rejected').
    * Allow Patients to transition states ('cancelled' with a mandatory cancelReason string).
  - `patientCheckIn`: 
    * Update status to 'confirmed' (if pending) and set `checkedInAt` to the current system timestamp (`Date.now()`).
  - `getTodayAppointments`: 
    * Fetch all appointments matching today's date for a specific `doctorId`, populated with Patient profile names.

3. EXPOSED ENDPOINTS (API ROUTES)
Target File Path: `backend/routes/appointmentRoutes.js`
Routes to Mount and Protect:
  - POST `/api/appointments` -> Protected (Patient only) -> calls `createAppointment`
  - GET `/api/appointments/today` -> Protected (Doctor only) -> calls `getTodayAppointments`
  - PATCH `/api/appointments/:id/status` -> Protected (Doctor/Patient) -> calls `updateStatus`
  - PATCH `/api/appointments/:id/checkin` -> Protected (Patient only) -> calls `patientCheckIn`

4. FRONTEND SERVICE LAYER
Target File Path: `frontend/src/api/appointmentService.js`
Functions to Export:
  - `bookAppointment(payload)` -> POSTs to `/api/appointments`
  - `fetchTodayAppointments()` -> GETs from `/api/appointments/today`
  - `updateAppointmentStatus(id, status, cancelReason)` -> PATCHes to `/api/appointments/${id}/status`
  - `checkInAppointment(id)` -> PATCHes to `/api/appointments/${id}/checkin`

5. FRONTEND UI VIEWS (TAILWIND CSS)
Target Directory: `frontend/src/components/`
Components to Autonomously Build:
  - `AppointmentList.jsx`: A responsive list/grid view using Tailwind.
    * For Doctors: Renders an active dashboard panel tracking today's list of slots, displaying patient names, times, and clear action buttons to 'Accept', 'Reject', or view check-in markers.
    * For Patients: Displays a history panel of their bookings tracking live status badges with conditional colors (Green for confirmed, Yellow for pending, Red for rejected/cancelled) and a functional 'Check-In' button if the booking is today.

---

## ⚡ Module 4: Real-Time Live Queue (WebSockets)
Use this prompt when you are ready to implement the real-time event syncing layer via Socket.io:

Role: Senior Real-Time Systems Architect and React Custom Hooks Specialist.
Context: I am implementing Module 4 (Live Queue & Real-Time Updates) for 'DoctorDayPlan v1.0'. The system must synchronize live consultation queues between Doctors and Patients instantly using Socket.io (v4+) and React Context.

Task: Generate the complete client-side custom hooks/providers and the backend event handlers for real-time queue synchronization.

Requirements to enforce:
1. Event-Driven Logic: Handle events for: `joinQueueRoom`, `queueUpdated`, `callNextPatient`, `skipPatient`, and `consultationFinished`.
2. Encapsulation: Keep socket event listeners isolated outside of raw component files using a React Custom Hook or Context Provider.
3. Clean Payload Architecture: Always transmit structured objects containing `clinicId`, `appointmentId`, `currentQueuePosition`, and `estimatedWaitTime`.

Execute the following steps explicitly:

### STEP 1: BACKEND SOCKET HANDLER (`sockets/queueHandler.js`)
Generate a modular Node.js Socket.io initialization file that takes the `io` instance and sets up:
- Connection and disconnection event listeners.
- Room-based mapping: Users join a room dedicated to a specific clinic (`io.to(clinicId)`).
- Events to handle: Broadcasting an updated queue state array to everyone in a room when a doctor modifies the order (calls, skips, or checks-in a patient).

### STEP 2: CLIENT SOCKET CONTEXT & PROVIDER (`src/context/QueueContext.jsx`)
Create a clean React Context and Provider that:
- Initializes a single, shared socket connection to `process.env.REACT_APP_SOCKET_URL`.
- Exposes states for: `liveQueue` (array of waiting patients), `currentPatient` (object), and `isConnecting` (boolean).
- Automatically cleans up (`socket.disconnect()`) when the provider component unmounts.

### STEP 3: CUSTOM CONSUMER HOOKS (`src/hooks/useLiveQueue.js`)
Provide a clean React hook exposing simple wrapper functions for components to invoke without touching raw socket logic:
- `joinClinicQueue(clinicId)`
- `nextPatient(clinicId)`
- `skipCurrentPatient(clinicId)`

Output Format: Provide fully functional JavaScript/JSX code blocks for each file. Ensure zero placeholders (`// implement here...`) are left in the event handlers. Do not include verbose written explanations between the code blocks.

========================================================================
FEATURE SPECIFICATION SHEET: MODULE 4 (LIVE QUEUE & REAL-TIME UPDATES)
========================================================================

1. BACKEND REAL-TIME EVENT HANDLER
Target File Path: `backend/sockets/queueHandler.js`
Logic to Implement:
  - Export a standalone module function initializing Socket.io connection streams:
    * `joinQueueRoom`: Listens for users connecting to a unique room scoped by clinic identity (`socket.join(clinicId)`).
    * `callNextPatient`: Listens for a doctor pulling the next sequential checked-in appointment. Updates local state buffers, identifies the target patient, and broadcasts the event `queueUpdated` to the specific `clinicId` room room array payload.
    * `skipPatient`: Listens for a doctor bypassing a patient. Reorders the active queue buffer array index, sends a real-time event signal, and updates room payloads.
    * `consultationFinished`: Cleans up the queue room matrix by removing the active patient from the live queue tracking array buffer.
  - Automatically emit the `queueUpdated` broadcast payload object containing: `{ currentPatient, waitingQueueArray, estimatedWaitTime }`.

2. EXPOSED INITIALIZATION HOOK
Target File Path: `backend/server.js`
Integration to Enforce:
  - Refactor the app startup logic to wrap the Express instance inside a native Node HTTP server: `const server = require('http').createServer(app);`.
  - Instantiate Socket.io: `const io = require('socket.io')(server, { cors: { origin: "*" } });`.
  - Pass the `io` stream directly into the `queueHandler` script on connection. Ensure the root script updates `app.listen` to `server.listen`.

3. FRONTEND REAL-TIME CONTEXT & CUSTOM HOOK
Target File Paths: `frontend/src/context/QueueContext.jsx` and `frontend/src/hooks/useLiveQueue.js`
Logic to Implement:
  - `QueueContext.jsx`: Build a standard React Context Provider configuring `socket.io-client`. Map runtime states for `liveQueue`, `activePatient`, and `wsConnectionStatus`. Establish standard useEffect hooks to automatically cleanup and drop listeners (`socket.off`) when components unmount.
  - `useLiveQueue.js`: Export simple wrapper commands: `joinClinicQueue(clinicId)`, `triggerNextPatient(clinicId)`, and `triggerSkipPatient(clinicId)`.

4. FRONTEND LIVE DASHBOARD COMPONENTS (TAILWIND CSS)
Target File Path: `frontend/src/components/LiveQueue.jsx`
Views to Autonomously Build:
  - Create a responsive split-screen queue tracking view:
    * Doctor Dashboard Panel: Renders full action bars containing 'Call Next Patient' or 'Skip' control buttons that route signals through WebSockets.
    * Patient Tracker Card: Displays a live flashing status display showing their current placement number, estimated wait timeline, and the name of the patient currently in the consultation room.

---

## 📄 Module 5: Consultation & Medical Records
Use this prompt when implementing the medical records lookup and PDFKit direct data streaming:

Role: Senior Backend Engineer and Node.js Streams Expert.
Context: I am implementing Module 5 (Consultation & Medical Records) for 'DoctorDayPlan v1.0'. The system records new clinical diagnoses, handles patient medical history lookups, and dynamically generates downloadable prescription files via PDFKit.

Task: Create the backend controller for handling clinical data entries and a dedicated pipeline utility file for streaming secure PDFs.

Requirements to enforce:
1. Dynamic PDF Streaming: Do not save PDF files to disk. Stream the generated PDF directly into the Express HTTP response object (`res`) with correct headers (`application/pdf`).
2. Data Structure Alignment: Pull details exactly matching the `Consultation` and `Medicine` schema models (symptoms, diagnosis, medicine names, and categories).
3. Document Security: Ensure layout safety by setting strict margins, clean fonts, and explicit structural section lines (Header, Symptoms, Diagnosis, and Rx Table).

Execute the following steps explicitly:

### STEP 1: PDF GENERATION UTILITY (`utils/prescriptionGenerator.js`)
Generate a standalone JavaScript module that exports a single function: `generatePrescriptionPDF(res, consultationData)`.
- Import `pdfkit`.
- Accept the Express `res` object as a writable target stream.
- Pipe a professional medical layout to the response object, including:
  - Doctor / Clinic Letterhead space.
  - Patient basic details block (Name, Date, Consultation ID).
  - Clean structured text sections for Symptoms and Diagnosis.
  - A clean tabular text alignment layout loop for the `medicines` array showing name, category, and dosage fields.
- Call `.end()` on the document to finalize the stream safely.

### STEP 2: CONSULTATION CONTROLLER (`controllers/consultationController.js`)
Generate an Express controller containing production-ready, asynchronous middleware methods:
- `createConsultation`: Validates request bodies, saves a new record to the Consultation collection, and returns the document object.
- `getPatientHistory`: Fetches and sorts previous consultations for a specific `patientId` down inside the MongoDB database.
- `downloadPrescription`: Fetches full consultation data populated with referenced fields, and immediately invokes the Step 1 PDF utility passing the current HTTP response.

Output Format: Provide raw, robust JavaScript code blocks for both files. Ensure all structural paths match standard Express parameters (`req, res, next`) with explicit try/catch blocks. Do not add markdown annotations or text commentary outside of the code blocks.

========================================================================
FEATURE SPECIFICATION SHEET: MODULE 5 (CONSULTATION & MEDICAL RECORDS)
========================================================================

1. BACKEND SCHEMA SPECIFICATION
Target File Path: `backend/models/Consultation.js`
Fields to Implement:
  - appointmentId: ObjectId (Ref: 'Appointment', Required, Unique)
  - patientId: ObjectId (Ref: 'User', Required)
  - doctorId: ObjectId (Ref: 'User', Required)
  - clinicId: ObjectId (Ref: 'Clinic', Required)
  - diagnosis: String (Required)
  - clinicalNotes: String
  - medicines: Array of Objects (Prescription Data)
    * name: String (Required)
    * dosage: String (e.g., "1-0-1", Required)
    * durationDays: Number (Required)
    * instructions: String (e.g., "After food")
Constraints to Enforce:
  - Enforce standard Mongoose timestamps (createdAt, updatedAt).

2. BACKEND CONTROLLER & PDF STREAMING PIPELINE
Target File Paths: `backend/utils/prescriptionGenerator.js` and `backend/controllers/consultationController.js`
Logic to Implement:
  - `prescriptionGenerator.js`: Build a pure streaming function `generatePrescriptionPDF(res, data)`. 
    * Import `pdfkit`. Configure express header targets `res.setHeader('Content-Type', 'application/pdf')`.
    * Stream vector data directly into the express socket using `doc.pipe(res)`. 
    * Render a clean header layout block containing placeholder clinic logos, doctor credentials, clear tabular alignments for the prescribed medicine rows, and close the stream using `doc.end()` safely. Never touch local disk arrays.
  - `consultationController.js`:
    * `createConsultation`: Collect variables, store record to the `Consultation` collection, and change the corresponding appointment object status enum to 'completed'.
    * `getHistory`: Return sorted lookup strings containing previous consultations populated with clinic and doctor profiles.
    * `downloadPrescription`: Read consultation ID parameters, extract populated arrays from the database, and feed the structural object directly into the PDF utility engine.

3. EXPOSED ENDPOINTS (API ROUTES)
Target File Path: `backend/routes/consultationRoutes.js`
Routes to Mount and Protect:
  - POST `/api/consultations` -> Protected (Doctor only) -> calls `createConsultation`
  - GET `/api/consultations/patient/:patientId` -> Protected (Doctor/Patient) -> calls `getHistory`
  - GET `/api/consultations/:id/download` -> Protected (Doctor/Patient) -> calls `downloadPrescription`

4. FRONTEND SERVICE LAYER & VIEWS (TAILWIND CSS)
Target Files: `frontend/src/api/consultationService.js` and `frontend/src/components/ConsultationWorkspace.jsx`
Logic to Implement:
  - Service: Export call mechanisms. Ensure `downloadPrescription` processes payloads utilizing an Axios response configuration type of `blob` to cleanly launch local browser download states.
  - `ConsultationWorkspace.jsx`: An interactive electronic medical records interface (EMR). Renders diagnosis inputs, medical history timeline feeds, dynamic form arrays to append prescription rows, and a simple download button that triggers native PDF browser downloads instantly.