---
name: 🤖 MERN Feature Agent Orchestration
about: Command specialized AI agents to autonomously build and write feature modules directly into the workspace files.
title: 'feat: Implement [Insert Module/Feature Name Here]'
labels: ['agentic-build', 'mern-stack']
assignees: ''
---

## 📋 Feature Context
Identify the component or module from DoctorDayPlan v1.0 to build next:
* **Target Feature/Module:** [e.g., Module 3: Appointment Management]
* **Target Collection/Schema:** [e.g., models/Appointment.js]

---

## 🤖 Master Orchestration Instructions
*Attention Copilot Workspace / Agentic Engine: Ingest our core rules from `.github/copilot-instructions.md` and execute the following sequential multi-agent orchestration loop. You have full read/write permission to modify files in this directory.*

### 🛠️ Step 1: [Data Architect Persona]
* Inspect existing database structures inside the `backend/models/` directory.
* Autonomously create or modify the target Mongoose schema file. Write the complete, production-ready code directly to the workspace file path.
* Enforce absolute relational validation rules, strict indexing, required fields, and active timestamps.

### 🔌 Step 2: [Backend API Persona]
* Wait for Step 1 file writes to resolve successfully.
* Autonomously create or update production-ready Express controller files and routing sheets inside `backend/controllers/` and `backend/routes/`.
* Write secure, asynchronously managed code paths wrapped in robust `try/catch` validation frameworks.

### 💻 Step 3: [Frontend Specialist Persona]
* Read the backend routing contracts created in Step 2.
* Autonomously generate an abstracted client network service file inside `frontend/src/api/` using our centralized Axios configuration.
* Construct responsive modular UI presentation components directly into `frontend/src/components/` using clean functional React syntax and declarative Tailwind CSS.

### 🛡️ Step 4: [QA Review Persona]
* Code audit all newly introduced or updated workspace files.
* Verify proper structural code paths, clean dependency tracking, and correct import/export scopes.
* Run standard linter commands or syntax checks if accessible.
* Output a clear file diff overview summarizing the modifications you have applied directly to our repository directory.
