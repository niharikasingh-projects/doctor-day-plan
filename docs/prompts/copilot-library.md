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

---

## 📄 Module 5: Clinical History & PDF Generation
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
