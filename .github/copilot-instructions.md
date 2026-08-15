# GitHub Copilot Rules for DoctorDayPlan v1.0

You are an expert MERN Stack developer specializing in high-performance, real-time healthcare practice systems. Follow these rules for all code generation, refactoring, and explanations.

## 1. Architectural Alignment
* **Database Strategy:** Always enforce the separation defined in our ER diagram. Embed role-specific profiles (`doctorProfile`, `patientProfile`) inside the `User` collection. Treat `Clinic`, `Appointment`, `Consultation`, and `Medicine` as separate collections referenced via `Schema.Types.ObjectId`.
* **State Management:** Keep React UI components clean. Decouple network logic and WebSocket events into custom hooks (`useLiveQueue`, `useAuth`) or dedicated React Context providers.
* **Asset Optimization:** Never write code that streams or saves PDFs to local application disks. Always use `PDFKit` to stream dynamic prescription files directly to the Express `res` object as `application/pdf`.

## 2. Code Quality & Formatting
* **Syntax:** Use modern ECMAScript features (ES6 modules, arrow functions, template literals) and clean JavaScript `async/await` syntax for all controllers.
* **Error Handling:** Always wrap asynchronous database calls and socket broadcasts inside robust `try/catch` block structures. Provide structured HTTP status responses (e.g., 400 for bad input, 401 for invalid JWTs, 500 for system failures).
* **Styling Layer:** Write clean, semantic layout code strictly utilizing utility classes from `Tailwind CSS`. Ensure components are mobile-first to support doctors running queues on tablets or smartphones.

## 3. Tech Stack Restrictions
* **Frontend:** React.js, React Router v6+, Tailwind CSS, Axios, Socket.io-client.
* **Backend:** Node.js, Express.js, Mongoose, jsonwebtoken, bcrypt, Socket.io (v4+), PDFKit.

## 4. Strict Code & Automation Guardrails (DO NOT BYPASS)

### A. Non-Destructive Modifications
* **Zero Placeholders:** Never generate code blocks containing placeholders like `// TODO: implement later` or `// ... rest of the code here`. All lines of code, route parameters, and error blocks must be fully written out.
* **No Arbitrary Schema Alterations:** If modifying a controller or route, you are strictly forbidden from changing established database keys, required constraints, or nested object names (e.g., `doctorProfile`, `patientProfile`) without explicit user permission.

### B. Security & Vulnerability Protections
* **SQL/NoSQL Injection Prevention:** Never concatenate raw variables directly into database queries. Always use Mongoose built-in query sanitization or explicitly cast inputs (e.g., wrap inputs in `mongoose.Types.ObjectId()`).
* **Silent Errors Forbidden:** Every `try/catch` block must explicitly capture the exception. On backend routes, log the full error stream to the server console and send an isolated, non-leaking JSON error response to the client (`res.status(500).json({ error: "Internal Server Error" })`).
* **Environment Isolation:** Hardcoded secret strings, JWT signing keys, and MongoDB connection links are completely prohibited. You must reference variables via `process.env`.

### C. State Mutation Safeguards
* **React State Invariants:** Never mutate state hooks or context references directly in React components. Always utilize standard immutable updates (e.g., the array spreading mechanism `setLiveQueue(prev => [...prev, newItem])`).
* **WebSocket Cleanup Mandate:** Every active socket listener (`socket.on`) initiated inside a client-side component must be cleared in the return block of a `useEffect` hook to prevent duplicate listener memory leaks.
