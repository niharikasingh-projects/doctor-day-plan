# GitHub Copilot Rules for DoctorDayPlan v1.1

You are an expert MERN Stack developer specializing in high-performance, real-time healthcare practice systems. Follow these rules for all code generation, refactoring, and explanations.

## 1. Architectural Alignment
* **Database Strategy:** Always enforce the separation defined in our ER diagram. Embed role-specific profiles (`doctorProfile`, `patientProfile`) inside the `User` collection. Treat `Clinic`, `Appointment`, `Consultation`, and `Medicine` as separate collections referenced via `Schema.Types.ObjectId`.
* **State Management:** Keep React UI components clean. Decouple network logic and WebSocket events into custom hooks (`useLiveQueue`, `useAuth`) or dedicated React Context providers.
* **Asset Optimization:** Never write code that streams or saves PDFs to local application disks. Always use `PDFKit` to stream dynamic prescription files directly to the Express `res` object as `application/pdf`.
* **v1.1 Feature Baseline (established, do not regress):**
  * `doctorProfile.licenseNumber` is **mandatory** for doctors, must match `/^[A-Za-z0-9\-/]{5,20}$/`, and is unique via a sparse index (`doctorProfile.licenseNumber`). Registration and profile update must both enforce it.
  * Forgot-password flow: `POST /api/auth/forgot-password` stores a **sha256-hashed** token on the user (`passwordResetToken`/`passwordResetExpires`, both `select: false`, 15-minute TTL) and answers generically; `POST /api/auth/reset-password` consumes it once. The raw token is only returned in the response outside production (no email service is wired up).
  * List endpoints return a **paginated envelope** `{ data, pagination: { total, page, limit, totalPages } }`: `GET /api/appointments/upcoming`, `GET /api/appointments/my`, `GET /api/consultations/patient/:patientId`, `GET /api/consultations/search`. All accept `page`/`limit` (default 1/10, max 100) and `all=true` (server-capped at 5000) for Excel exports.
  * `GET /api/clinics` returns **all** clinics (active first). Closed (`inactive`) clinics must be shown disabled and marked "Closed" in the patient booking UI; `POST /api/appointments` rejects bookings against them with 400.
  * Patient search (`/api/consultations/search`) matches name/email/phone **and** consultation `diagnosis` text; diagnosis hits carry a `matchedDiagnoses` array.
  * Public doctor profile for patients: `GET /api/auth/doctors/:doctorId` (license number included).
  * Excel export uses the shared `frontend/src/utils/exportExcel.js` (SheetJS `xlsx`) — never hand-rolled CSV-for-Excel.
  * Seed script generates bulk mock data (≥1000 appointment records per test doctor, ≥100 per test patient) — keep `npm run seed` idempotent.

## 2. Code Quality & Formatting
* **Syntax:** Use modern ECMAScript features (arrow functions, template literals) and clean JavaScript `async/await` syntax for all controllers. Note: the backend is CommonJS (`require`/`module.exports`) — match each file's existing module system.
* **Error Handling:** Always wrap asynchronous database calls and socket broadcasts inside robust `try/catch` block structures. Provide structured HTTP status responses (e.g., 400 for bad input, 401 for invalid JWTs, 500 for system failures).
* **Validation:** Every public mutating endpoint must validate inputs server-side using the helpers in `backend/utils/validators.js` (email, phone, password strength, ObjectId, HH:mm time, license number, date sanity). Mirror with HTML5 attributes (`required`, `minLength`, `min`, `max`, `type`) plus friendly placeholders on the React side.
* **Styling Layer:** Write clean, semantic layout code strictly utilizing utility classes from `Tailwind CSS`. Ensure components are mobile-first to support doctors running queues on tablets or smartphones. Every text input/select/textarea must have an associated `<label htmlFor>` and, where it aids entry, an example `placeholder` (e.g. `e.g. MCI-12345`).

## 3. Tech Stack Restrictions
* **Frontend:** React.js, React Router v6+, Tailwind CSS, Axios, Socket.io-client, SheetJS `xlsx` (Excel export only).
* **Backend:** Node.js, Express.js, Mongoose, jsonwebtoken, bcrypt, Socket.io (v4+), PDFKit.

## 4. Strict Code & Automation Guardrails (DO NOT BYPASS)

### A. Non-Destructive Modifications
* **Zero Placeholders:** Never generate code blocks containing placeholders like `// TODO: implement later` or `// ... rest of the code here`. All lines of code, route parameters, and error blocks must be fully written out.
* **No Arbitrary Schema Alterations:** If modifying a controller or route, you are strictly forbidden from changing established database keys, required constraints, or nested object names (e.g., `doctorProfile`, `patientProfile`) without explicit user permission.
* **Envelope Compatibility:** Do not change the `{ data, pagination }` response envelope back to bare arrays — frontend pagination and export depend on it.

### B. Security & Vulnerability Protections
* **SQL/NoSQL Injection Prevention:** Never concatenate raw variables directly into database queries. Always use Mongoose built-in query sanitization or explicitly cast inputs (e.g., wrap inputs in `mongoose.Types.ObjectId()`). Regex-based search must escape user input via `escapeRegex` before building a `RegExp`.
* **Silent Errors Forbidden:** Every `try/catch` block must explicitly capture the exception. On backend routes, log the full error stream to the server console and send an isolated, non-leaking JSON error response to the client (`res.status(500).json({ error: "Internal Server Error" })`).
* **Environment Isolation:** Hardcoded secret strings, JWT signing keys, and MongoDB connection links are completely prohibited. You must reference variables via `process.env`.
* **Password Reset Isolation:** Never return the password reset token in production responses; never store it unhashed; always expire it (15 minutes) and clear it after a successful reset.

### C. State Mutation Safeguards
* **React State Invariants:** Never mutate state hooks or context references directly in React components. Always utilize standard immutable updates (e.g., the array spreading mechanism `setLiveQueue(prev => [...prev, newItem])`).
* **WebSocket Cleanup Mandate:** Every active socket listener (`socket.on`) initiated inside a client-side component must be cleared in the return block of a `useEffect` hook to prevent duplicate listener memory leaks.
* **Blob Download Safety:** When downloading binary streams (PDF), set `responseType: 'blob'`, verify the `content-type` is `application/pdf` before saving (parse JSON error blobs into thrown errors), and delay `URL.revokeObjectURL` (~1s) so the browser does not cancel the download.

### D. Agent Execution & Write Permissions
* **Direct File Mutation:** You are authorized and expected to create, write, and modify code files directly within the project directories (`backend/` and `frontend/`). Do not simply wrap snippets in conversational prose or ask the user to manually copy-paste them.
* **Complete File Writes:** When writing to a target path, always output the full, complete file structure with zero truncated sections or missing code closures.
* **Workspace Synchronization:** Check existing file trees and dependencies before writing to ensure your imports perfectly match our monorepo paths.

## 5. Post-Change Verification Guardrails (run after every implementation)

1. **Backend tests:** from `backend/`, run `npm.cmd test` (PowerShell blocks `npm.ps1` on this machine — always use `npm.cmd`). All Jest suites must pass; add/extend integration tests in `backend/__tests__/modules.integration.test.js` for every new endpoint or validation rule.
2. **Frontend build & lint:** from `frontend/`, run `npm.cmd run build` then `npm.cmd run lint`. Both must pass with zero errors.
3. **Seed sanity:** after schema changes, re-run `npm.cmd run seed` from `backend/` against a dev database to confirm the script stays idempotent.
4. **Code review checklist before reporting done:**
   * No placeholders, no truncated files, no silent `catch` blocks.
   * New list endpoints are paginated and the frontend renders `<Pagination />` controls.
   * New user inputs are validated on both client (HTML5 + friendly messages) and server (`validators.js`) sides.
   * No schema keys renamed or removed; new fields are additive and documented in this file.
   * Socket listeners have cleanup; no direct state mutation.
   * No secrets hardcoded; everything sensitive flows through `.env`.

