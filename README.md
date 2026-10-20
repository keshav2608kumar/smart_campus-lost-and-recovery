# Smart Campus Lost & Found System

A comprehensive, clean modular monolith for managing lost and found items on campus, complete with a MySQL 8 backend, a transaction-safe matching engine, and a React frontend.

## 🚀 Technology Stack
*   **Database**: MySQL 8.x (InnoDB) strictly compliant. No PostgreSQL dependencies.
*   **Backend**: Python 3.x, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, Passlib, JWT.
*   **Frontend**: React 18, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React.

## 🗄️ Database Normalization & Architecture
The MySQL database is normalized to 3NF. We use foreign keys, unique constraints, and strict enum checks to ensure data integrity. 
To prevent race conditions when multiple staff members attempt to approve claims simultaneously, the engine utilizes `SELECT ... FOR UPDATE` (row-level locking) during the approval transaction.

---

## 🛠️ Windows 11 Setup Guide

### 1. Install & Configure MySQL 8.x
1. Download and install MySQL 8.x Community Server for Windows.
2. Open MySQL Command Line Client or MySQL Workbench and run:
   ```sql
   CREATE DATABASE smart_campus;
   ```
3. Load the schema and seed data into your MySQL database:
   ```bash
   # From the project root
   mysql -u root -p smart_campus < database/schema.sql
   mysql -u root -p smart_campus < database/seed.sql
   ```
   *(Note: The seed data includes `alice@campus.edu` and `staff@campus.edu` with the password `password123`)*

### 2. Backend Setup
1. Open PowerShell and navigate to the `backend` directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Copy the environment variables template and configure it (ensure your MySQL password matches):
   ```powershell
   Copy-Item .env.example .env
   ```
5. Start the FastAPI server:
   ```powershell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The Swagger UI will be available at: http://localhost:8000/docs*

### 3. Frontend Setup
1. Open a new PowerShell window and navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```
2. Install the React dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   *The React app will be available at: http://localhost:5173*

---

## 🔍 Testing the Workflow
1. Navigate to `http://localhost:5173/login` in your browser.
2. Login as a student: `alice@campus.edu` / `password123`.
3. View the active items on the Dashboard.
4. Open the FastAPI Swagger UI (`http://localhost:8000/docs`) to trigger the matching engine or test Staff Claim Approvals using the staff account (`staff@campus.edu`).
