---
name: 🤖 MERN Feature Agent Orchestration
about: Initialize a multi-agent orchestration loop to build a feature or module end-to-end.
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
*Attention Copilot Workspace / Agentic Engine: Ingest our core rules from `.github/copilot-instructions.md` and execute the following sequential multi-agent orchestration loop.*

### 🛠️ Step 1: [Data Architect Persona]
* Inspect existing database architectures inside the `models/` directory.
* Automatically generate or update the target Mongoose schema file. 
* Enforce absolute relational validation rules, strict indexing, required fields, and active timestamps.

### 🔌 Step 2: [Backend API Persona]
* Wait for the schema compilation from Step 1 to resolve successfully.
* Generate production-ready Express controller files and routing sheets inside `controllers/` and `routes/`.
* Write secure asynchronously managed code paths wrapped securely in robust `try/catch` validation frameworks.

### 💻 Step 3: [Frontend Specialist Persona]
* Read the backend routing contracts created in Step 2.
* Generate an abstracted client network service file inside `src/api/` using our centralized Axios configuration.
* Construct responsive modular UI presentation components using clean functional React syntax and declarative Tailwind CSS.

### 🛡️ Step 4: [QA Review Persona]
* Code audit all newly introduced or updated workspace files.
* Verify proper structural code paths, clean dependency tracking, and correct import/export scopes.
* Output a clear file diff overview summarizing the workspace updates.
