# AICTE SmartFlow

> **"Smarter Approvals. Proactive Compliance. Zero Missed Deadlines."**  
> Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System for Technical Educational Institutions across India.

---

## 1. Project Objective & Regulatory Scope

Technical education in India operates under the regulatory guidelines of the **All India Council for Technical Education (AICTE)**. Every year, over 10,000 engineering, management, pharmacy, and polytechnic colleges must navigate the **Approval Process Handbook (APH)** for:
- Extension of Approval (EoA)
- Increase in Intake or Division
- Introduction of New Courses / Emerging Areas
- Supernumerary Seats & Accreditation Compliance

Institutions face severe operational challenges:
1. **Document Chaos**: Hundreds of unlinked land titles, building plans, fire safety NOCs, faculty appointment letters, and Form-16 proofs scattered across departments.
2. **Dynamic Regulatory Complexity**: Tracking 100+ norms covering Faculty-to-Student Cadre Ratios (1:15), instructional carpet area, barrier-free accessibility, and computer terminal density.
3. **Severe Penalties for Missed Deadlines**: Strict, non-extendable AICTE portal cutoffs lead to rejection or admission zero-years.
4. **Audit Anxiety**: Lack of confidence scoring, evidence verification, and review sign-off before official submission.

**AICTE SmartFlow** solves this by automating internal institutional preparation, orchestrating reviewer workflows, extracting evidence via OCR, calculating deterministic compliance scores, assessing multi-factor institutional risk, and providing proactive multi-interval deadline alerts.

> **Notice & Compliance Boundary**: AICTE SmartFlow automates internal institutional compliance and preparation. It does NOT claim to grant official AICTE approval or submit applications without authorized verification.

---

## 2. Technology Stack

- **Frontend**: React 19 with TypeScript, Vite 8, Tailwind CSS, shadcn-inspired dark enterprise SaaS design, Lucide React icons, Recharts data visualization.
- **Backend**: Python 3.14 with FastAPI, Pydantic v2, PyMuPDF (fitz) for PDF layout and text parsing, ReportLab for official PDF compliance audit reports, APScheduler for background deadline monitoring.
- **Database**: PostgreSQL / SQLite via SQLAlchemy 2.0 ORM with Alembic database migrations.
- **Authentication**: Secure JWT (JSON Web Tokens) with role-based authorization (RBAC) enforced on the backend.
- **AI & RAG Engine**: Retrieval-Augmented Generation grounded strictly in official AICTE Approval Process Handbook (2024-2027) regulatory chunks, with verified source citations (Title, Chapter, Section, Page number).

---

## 3. User Roles & Demo Credentials

The platform enforces four distinct roles across backend endpoints and UI capabilities:

| Role | Person Name & Designation | Demo Email | Demo Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Rajesh Kumar Verma (*AICTE Regional Director*) | `superadmin@aicte.gov.in` | `SuperAdmin@2026` | Cross-institution oversight, system audit logs, regulatory rule definitions |
| **Institution Admin** | Dr. Ramesh Chandra Sharma (*Director / Principal*) | `admin@aitm.edu.in` | `Admin@2026` | Institutional applications, document uploads, submissions, staff assignments |
| **Compliance Officer** | Prof. Sunita Deshmukh (*Dean Academics & Regulatory Lead*) | `compliance@aitm.edu.in` | `Compliance@2026` | Evaluates rule engine, overrides assessments, assigns remediation tasks |
| **Reviewer** | Prof. Arvind Swaminathan (*Senior Reviewer*) | `reviewer@aitm.edu.in` | `Reviewer@2026` | Verifies evidence, flags deficiencies, requests corrections, adds notes |

> **Evaluator Tip**: The application includes a top-navigation **Persona Switcher** that allows one-click switching between any role during evaluation without re-typing credentials!

---

## 4. Main Application Modules

### A. Executive Dashboard
- **Active Approval Workflows**: Real-time counter of current institutional applications.
- **Compliance Status**: Pass percentage of evaluated AICTE APH norms (e.g. 71% Pass Rate).
- **Missing / Deficient Evidence**: Highlighted count of unuploaded mandatory documents.
- **Institutional Risk Score Gauge**: 0-100 score classified into Low, Medium, High, or Critical.
- **Upcoming & Overdue Deadlines**: Countdown to AICTE portal submission cutoff.
- **Visual Charts**:
  - Recharts Area Chart: Compliance Progression Trend over time.
  - Recharts Horizontal Bar Chart: Distribution of applications across workflow stages.
- **Recent Activities & Live Alerts**: Instant notification feed with action buttons.

### B. Approval Workflow State Machine
Strict sequential lifecycle with permission checks:
$$\text{Draft} \longrightarrow \text{Document Collection} \longrightarrow \text{Automated Validation} \longrightarrow \text{Officer Review} \longrightarrow \text{Internal Approval} \longrightarrow \text{Ready for Submission} \longrightarrow \text{Submitted (Manual Entry)} \longrightarrow \text{External Decision Recorded}$$

- Prevents illegal skips (e.g., cannot jump from Draft directly to Ready for Submission).
- Allows branches: Reviewer can request corrections ($\rightarrow$ `Corrections Required`) or sign off ($\rightarrow$ `Internal Approval`).
- Visual timeline stepper tracks stage progress, actor designations, comments, and timestamps.
- Records official AICTE submission reference number and order outcome (Approved, Deficiencies Communicated, Rejected).

### C. AI Document Intelligence
- Upload support for PDF, DOCX, and high-resolution scanned certificates (up to 25MB).
- **SHA-256 Duplicate Detection**: Prevents accidental or duplicate uploads of identical certificates.
- **PyMuPDF OCR Extraction**: Extracts total land in acres, carpet area in sq.m, Fire NOC validity date, faculty roll count, F:S ratio, and Principal Ph.D. status.
- **Confidence Scoring & Side-by-Side Review**: Split-screen display showing original OCR text alongside extracted key-value pairs with confidence percentages.
- **Human-in-the-Loop Correction**: Staff can correct OCR readings against original evidence.
- **Reviewer Sign-off**: Reviewer clicks "Verify Evidence", "Request Correction", or "Reject".

### D. Regulatory Compliance Rule Engine
Versioned rules based on **AICTE Approval Process Handbook (2024-2027)**:
- `AICTE-APH-LAND-01`: Minimum 2.5 Acres contiguous land in Urban/Metro cities (Chapter I, Clause 1.6).
- `AICTE-APH-BLDG-02`: Minimum 4.5 sq.m carpet area per student (Chapter II, Clause 2.3).
- `AICTE-APH-FAC-03`: 1:15 Faculty-to-Student Cadre Ratio & Principal Ph.D. requirement (Chapter II, Clause 2.4.1).
- `AICTE-APH-FIRE-04`: Valid State Fire Service NOC (Chapter I, Clause 1.8).
- `AICTE-APH-AFF-05`: University Affiliation Continuation Order (Chapter I, Clause 1.5).
- `AICTE-APH-ACC-06`: NBA Accreditation for >=30% eligible courses or NAAC Grade B+ (Chapter III, Clause 3.2).
- `AICTE-APH-FIN-07`: Audited Balance Sheet & Corpus Fund FD (Chapter II, Clause 2.12).

### E. AI Compliance Risk Engine
Deterministic, explainable risk scoring algorithm (0 to 100):
$$\text{Risk Score} = (0.30 \times \text{Missing Docs}) + (0.25 \times \text{Overdue Tasks}) + (0.20 \times \text{Expiring Docs}) + (0.25 \times \text{Critical Non-Compliance})$$

- Categorization: **Low** (0-20), **Medium** (21-45), **High** (46-70), **Critical** (71-100).
- Provides transparent sub-score progress bars, ranked deficiencies by impact score, and prioritized suggested corrective actions.

### F. Alert & Deadline Management
- Scheduled background checks for approaching application cutoffs and document expiration.
- Multi-interval warnings: 30, 14, 7, and 1 day before cutoff.
- Automatic escalation of overdue tasks to Compliance Officer.
- Deduplication keys prevent repeated alert spamming.
- In-app notification center with Acknowledge and Resolve actions.

### G. AI Compliance Assistant (RAG)
- Retrieval-Augmented Generation strictly grounded in approved AICTE APH regulatory chunks and authenticated institution records.
- Returns verified source citations: Source Title, Chapter, Clause, and Page Number.
- Safety Guard: Returns a clear "Insufficient evidence in regulatory database" message when asked unsupported or speculative questions.

### H. Reports & Append-Only Audit Trail
- One-click downloadable **PDF Compliance Dossier** generated with ReportLab.
- Structured **CSV Dataset Export** of compliance assessments and remediation tasks.
- **Append-Only Audit Log** tracking actor, action, entity, timestamp, and JSON state before-and-after diffs.

---

## 5. Hackathon Demonstration Scenario (13 Steps)

The application comes pre-seeded with **Aryabhata Institute of Technology & Management** (AICTE ID: 1-109283741). Evaluators can follow the interactive **Hackathon Demo Tour Bar** at the top of the interface:

1. **Create Approval Application**: Admin initializes the 2025-2026 Extension of Approval (EoA) in Draft stage.
2. **Upload Regulatory Documents**: Admin uploads Land Deed, Fire NOC, and Faculty Roster.
3. **Document Intelligence Extraction**: PyMuPDF extracts carpet area, fire validity (expires in 18 days!), and faculty strength.
4. **Compliance Engine Rule Evaluation**: Evaluator runs the rule engine; Land is marked *Compliant*, Fire NOC is flagged *Approaching Expiry*, and Faculty is flagged *Non-Compliant*.
5. **Transparent Risk Assessment**: Risk score indicates Medium risk (32.5/100) driven by expiring Fire NOC and incomplete faculty proofs.
6. **Automated Deadline & Expiry Alerts**: System logs high-priority alert for Fire NOC expiring in 18 days.
7. **Assign Remediation Task**: Compliance Officer assigns a 5-day task to upload missing Ph.D. verification for 2 faculty members.
8. **Reviewer Verification & Correction Request**: Reviewer flags missing proofs and logs a correction request note.
9. **Corrected Evidence Rectification**: Admin provides verified credentials and re-triggers validation.
10. **Reviewer Verification Sign-Off**: Reviewer marks the evidence as *Verified*.
11. **Dashboard Updates Compliance**: Compliance rate updates and risk score reduces.
12. **Audit Report & PDF Export**: Admin downloads the official PDF compliance audit dossier and views the audit trail.
13. **RAG AI Assistant Query**: Evaluator asks "What is the prescribed faculty-to-student cadre ratio?" and receives an answer with exact APH Chapter II citations.

---

## 6. Quick Start & Run Instructions

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ (Tested on Node.js 20)
- npm 10+

### Step 1: Clone Repository
```bash
git clone <repo-url>
cd SIH2026
```

### Step 2: Backend Setup & Seeding
```bash
cd backend
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.seed_data
```

To run the backend server:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Backend API will be running at `http://127.0.0.1:8000`.  
Swagger interactive docs are available at `http://127.0.0.1:8000/docs`.

### Step 3: Frontend Setup & Launch
In a new terminal window:
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Frontend will be running at `http://localhost:5173`.

### Step 4: Run Automated Tests
```bash
cd backend
python -m pytest tests/test_all.py -v
```
All 12 automated test suites (Auth, Workflow, Compliance Engine, Risk Engine, Alerts Deduplication, PDF/CSV generation, RAG citations) will run and report 100% pass!

---

## 7. PostgreSQL Setup (Production Option)

To connect AICTE SmartFlow to PostgreSQL:
1. Create a database: `CREATE DATABASE aicte_smartflow;`
2. Update `.env` or set environment variable:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:yourpassword@localhost:5432/aicte_smartflow
   ```
3. Run migrations and seed data:
   ```bash
   python -m alembic upgrade head
   python -m app.seed_data
   ```

---

## 8. Automated Test Suite Summary

```
tests/test_all.py::test_password_hashing_and_verification PASSED [  8%]
tests/test_all.py::test_jwt_token_generation PASSED              [ 16%]
tests/test_all.py::test_user_roles_exist PASSED                  [ 25%]
tests/test_all.py::test_workflow_state_transitions PASSED        [ 33%]
tests/test_all.py::test_compliance_rule_evaluation PASSED        [ 41%]
tests/test_all.py::test_risk_scoring PASSED                      [ 50%]
tests/test_all.py::test_alert_deduplication PASSED               [ 58%]
tests/test_all.py::test_pdf_report_generation PASSED             [ 66%]
tests/test_all.py::test_csv_report_generation PASSED             [ 75%]
tests/test_all.py::test_rag_knowledge_search PASSED              [ 83%]
tests/test_all.py::test_rag_response_with_citations PASSED       [ 91%]
tests/test_all.py::test_rag_insufficient_evidence PASSED         [100%]
======================= 12 passed in 6.49s =======================
```

---

## 9. System Architecture & Component Mapping

```
SIH2026/
├── backend/
│   ├── alembic/                # Alembic database migrations
│   ├── app/
│   │   ├── api/v1/             # REST API routers (Auth, Apps, Docs, Compliance, Risk, Alerts, Assistant, Reports)
│   │   ├── models/             # Normalized SQLAlchemy 2.0 entities & enums
│   │   ├── schemas/            # Pydantic v2 validation models
│   │   ├── services/           # OCR, Compliance Engine, Risk Engine, Scheduler, RAG Assistant, ReportLab
│   │   ├── config.py           # App settings & environment loader
│   │   ├── database.py         # SQLAlchemy engine & session management
│   │   ├── main.py             # FastAPI entrypoint & CORS middleware
│   │   └── seed_data.py        # Seed script with realistic AICTE college data
│   ├── tests/                  # Automated pytest test suite
│   ├── requirements.txt        # Python backend dependencies
│   └── alembic.ini             # Migration config
├── frontend/
│   ├── src/
│   │   ├── components/         # Dashboard, Workflow, Documents, Compliance, Risk, Alerts, Assistant, Reports, Admin
│   │   ├── context/            # AuthContext with demo persona switching
│   │   ├── services/           # Typed API service client
│   │   ├── types/              # TypeScript regulatory models
│   │   ├── App.tsx             # Root layout with Sidebar and Walkthrough Bar
│   │   └── main.tsx            # React 19 mount point
│   ├── tailwind.config.js      # Deep navy and charcoal theme tokens
│   └── package.json            # Vite, React, Lucide, Recharts
├── .env.example                # Sample environment variables
├── start_backend.bat           # 1-click backend launcher
├── start_frontend.bat          # 1-click frontend launcher
└── run_tests.bat               # 1-click test suite launcher
```

---

## 10. Known Limitations & Future Roadmap

- **Official AICTE API**: When AICTE publishes an authenticated external API, a secure gateway adapter can be enabled for automated direct submission. Currently, the system uses authenticated manual reference recording.
- **Biometric Aadhaar Authentication**: Integration of Digilocker / UIDAI verification for faculty appointments and Form-16 tax returns.
- **Multi-lingual Voice Interface**: Voice-assisted regulatory compliance assistant in Hindi and regional languages for rural technical institutions.

---

**AICTE SmartFlow** — Built with precision for national-level excellence in technical education governance.
