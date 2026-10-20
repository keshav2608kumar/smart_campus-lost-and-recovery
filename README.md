# 🎓 Smart Campus Lost & Found System

A modern, production-ready full-stack platform for campus-wide lost and found management, intelligent similarity matching, staff verification, custody handovers, and executive audit analytics.

---

## 🌐 Live Cloud Deployment Links

| Component | Provider | Live Link | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Application** | **Vercel** | [https://smart-campus-lost-and-recovery.vercel.app](https://smart-campus-lost-and-recovery.vercel.app) | 🟢 **Live** |
| **Backend API Service** | **Render** | [https://smart-campus-lost-and-recovery.onrender.com](https://smart-campus-lost-and-recovery.onrender.com) | 🟢 **Live** |
| **API Interactive Swagger Docs** | **FastAPI** | [https://smart-campus-lost-and-recovery.onrender.com/docs](https://smart-campus-lost-and-recovery.onrender.com/docs) | 🟢 **Live** |
| **Cloud Database (Serverless MySQL)** | **TiDB Cloud** | `gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000` | 🟢 **Active** |

---

## 👥 Demo Accounts & Credentials

All test accounts use the common password: **`password123`**

### 🎓 Students (Reporting & Claiming Items)
| Name | Role | Email | Password | Student Reg No |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Smith** | Student | `alice@campus.edu` | `password123` | `25BCE2880` |
| **Bob Jones** | Student | `bob@campus.edu` | `password123` | `25BCE2881` |
| **Charlie Brown** | Student | `charlie@campus.edu` | `password123` | `25BCE2882` |
| **David Miller** | Student | `david@campus.edu` | `password123` | `25BCE2883` |
| **Emma Watson** | Student | `emma@campus.edu` | `password123` | `25BCE2884` |

### 🛡️ Campus Staff & Administrator
| Name | Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Staff** | Campus Staff | `staff@campus.edu` | `password123` | Match Verification, Custody Intake, Handover Execution |
| **Admin User** | Administrator | `admin@campus.edu` | `password123` | System Analytics, Active Users (7), System Logs, Master Auditing |

---

## 🛠️ Technology Stack & Architecture

* **Database (MySQL 8.x / TiDB Cloud)**:
  * 3NF normalized relational schema with strict Foreign Keys, Indexes, and Check Constraints.
  * ACID transaction safety with `SELECT ... FOR UPDATE` row-level locking during handover to eliminate race conditions.
* **Backend API (FastAPI + Python 3.12+)**:
  * Asynchronous ASGI endpoints with Pydantic v2 schemas and OAuth2 JWT authentication.
  * Multi-criteria item similarity matching engine with confidence scoring.
* **Frontend (React 18 + Vite + Tailwind CSS)**:
  * Responsive role-based portals (Student Portal, Staff Custody Desk, Admin Executive Dashboard).
  * Lucide Icons, clean modern UI cards, search & filter drawers, and modal workflows.

---

## 🚀 Live Demonstration Flow for Evaluators

1. **Student 1 (Report Lost)**:
   * Login as **Alice Smith** (`alice@campus.edu` / `password123`).
   * Click **"Report Lost Item"**, enter item details (e.g. *Dell XPS Laptop* in *Library*), and submit. Status will be `ACTIVE`.
2. **Student 2 (Report Found)**:
   * Login as **Bob Jones** (`bob@campus.edu` / `password123`).
   * Click **"Report Found Item"**, enter matching found item details (e.g. *Found Silver Dell Laptop* in *Library*), and submit.
   * The backend matching engine automatically computes similarity and suggests a match.
3. **Staff Member (Verify & Handover)**:
   * Login as **Sarah Staff** (`staff@campus.edu` / `password123`).
   * Under **Potential Matches**, review the pair and click **"Verify Match"**.
   * When the claimant arrives at the campus desk, record notes and click **"Complete Handover"**.
   * Items automatically transition to `RECOVERED`.
4. **Administrator (Analytics & Oversight)**:
   * Login as **Admin User** (`admin@campus.edu` / `password123`).
   * Review total campus users, recovery rates, active vs resolved cases, and tamper-evident audit logs.

---

## 💻 Local Development Setup

### 1. Database Setup
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS smart_campus;"
mysql -u root -p smart_campus < database/complete_production_setup.sql
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Accessible locally at `http://127.0.0.1:5173`.
