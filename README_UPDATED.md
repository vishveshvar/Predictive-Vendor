# Predictive Vendor & Procurement Platform (Electronics & Gadgets)
## *Updated Setup, Environment Configuration & Master Verification Guide*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react)](https://react.dev)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-EB5424?style=flat&logo=xgboost)](https://xgboost.readthedocs.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongomock-47A248?style=flat&logo=mongodb)](https://www.mongodb.com)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![Pytest](https://img.shields.io/badge/Pytest-36%2F36%20Passed%20(100%25)-green?style=flat&logo=pytest)](https://pytest.org)
[![Vitest](https://img.shields.io/badge/Vitest-8%2F8%20Passed%20(100%25)-green?style=flat&logo=vitest)](https://vitest.dev)

---

## 1. Executive Summary & Takeover Notice

This repository contains the full-stack **Predictive Vendor & Procurement Platform**, an enterprise dual-portal system for wholesale electronics suppliers and retail store operators.

### Root Cause Analysis of Resolved Login Error:
When attempting to log in on `http://localhost:5173/login`, the UI previously crashed with:
> `Failed to execute 'json' on 'Response': Unexpected end of JSON input`

**Root Causes Identified & Repaired:**
1. **Missing Backend Dependency (`email-validator`)**: FastAPI / Pydantic schema generation for `EmailStr` in `backend/app/models/schemas.py` raised an unhandled `ImportError: email-validator is not installed` on backend startup. This caused Uvicorn to fail startup or crash before listening for HTTP connections.
2. **Backend Config Environment Loading**: `backend/app/core/config.py` was missing `python-dotenv` initialization (`load_dotenv()`) to parse local `.env` files and `FIREBASE_PRIVATE_KEY` escaped newlines (`.replace('\\n', '\n')`).
3. **Frontend Response Parsing**: `frontend/src/services/api.js` invoked `response.json()` directly without first reading `response.text()` or using a `try...catch` block. When Vite proxied an empty or HTML error page during backend startup failures, `response.json()` threw the unexpected end of JSON error.

**Fixes Implemented:**
- Installed `email-validator>=2.0.0` in Python environments and updated `backend/requirements.txt`.
- Enhanced `backend/app/core/config.py` to call `load_dotenv()` and correctly handle Firebase credentials and CORS origins.
- Updated `frontend/src/services/api.js` to parse responses with `response.text()` + `JSON.parse()` safely.
- Wrapped `/api/v1/auth/login` in structured `try...except` exception handling.
- Configured `.env` files for backend and frontend.

---

## 2. Environment Variables Configuration

### Backend Environment File: `backend/.env`
```env
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0
SECRET_KEY=replace-with-a-random-secret-at-least-32-characters-long
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000

# Database Configuration (MongoDB Atlas URI or local MongoDB)
# Note: If unreachable, the platform automatically activates mongomock fallback
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=predictive_vendor_db

# Firebase Credentials (Optional - Local HS256 JWT provider used if empty)
FIREBASE_CREDENTIALS_PATH=
FIREBASE_PROJECT_ID=predictive-vendor-demo
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Email / Notification Worker Configuration
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=alerts@predictivevendorml.com
EMAIL_FALLBACK_FILE=logs/email_outbox.log

# Power BI Embedded Integration (Optional)
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
POWERBI_TENANT_ID=
POWERBI_WORKSPACE_ID=
POWERBI_REPORT_ID=

# Paths & Random Seed
MODEL_PATH=ml_engine/model.pkl
METRICS_PATH=ml_engine/metrics.json
DATASET_PATH=../data/electronics_transactions.csv
RANDOM_SEED=42
```

### Frontend Environment File: `frontend/.env`
```env
VITE_API_BASE_URL=/api/v1
VITE_FIREBASE_API_KEY=AIzaSyDPSQSK5h3Rjy-ogaGx6XDR04f4i3-jESw
VITE_FIREBASE_AUTH_DOMAIN=predictive-vendor-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=predictive-vendor-demo
VITE_FIREBASE_STORAGE_BUCKET=predictive-vendor-demo.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=52365271306
VITE_FIREBASE_APP_ID=1:52365271306:web:16ed4f0cc0d3324a0bdaf3
```

---

## 3. Quick Start & Execution Commands

### Prerequisites
- Python 3.10+
- Node.js 18+ / npm

### Step 1: Backend Setup
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run dataset generation (optional if electronics_transactions.csv already exists)
python ml_engine/generate_dataset.py

# Train ML Model (Random Forest / XGBoost comparison)
python ml_engine/train_model.py 

# Launch FastAPI backend server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Frontend Setup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node modules
npm install

# Launch Vite development server on port 5173
npm run dev
```

Access the application in your browser at `http://localhost:5173`.

---

## 4. One-Click Demo Credentials

The platform features built-in demo presets for immediate validation:

| Role | Email | Tenant Store ID | Dashboard Route |
| :--- | :--- | :--- | :--- |
| **Retail Client 1** | `client1@store.com` | `STORE-001` (Apex Electronics) | `/client` |
| **Retail Client 2** | `client2@store.com` | `STORE-002` (TechHaven NY) | `/client` |
| **Wholesale Supplier** | `supplier@vendor.com` | Cross-Store Global Access | `/supplier` |

*Password for demo logins: `demo1234` (or click any of the 3 Quick-Login cards on the login page).*

---

## 5. Automated Test Suites Verification

Both backend and frontend test suites have been verified and pass 100%:

### Backend Pytest Suite (36/36 Passed)
```bash
# Run backend tests
cd backend
python -m pytest tests
```
*Coverage includes multi-tenant isolation guards, authentication handshakes, ML predictions, zero-LLM conversational aggregations, QR tracking redaction, and report generation.*

### Frontend Vitest Suite (8/8 Passed)
```bash
# Run frontend tests
cd frontend
npm test
```
*Coverage includes auth context state, quick login flow, component rendering, and role-based route protection.*

---

## 6. Core System Modules Overview

1. **Multi-Tenant Gateway (`/auth/login`)**: Custom claims enforcement (`store_client_id`, `role`), dual Firebase / standalone HS256 JWT auth.
2. **Supplier Command Center (`/supplier`)**: Cross-store aggregate demand, order fulfillment lifecycle, inventory heatmap, and client rankings.
3. **Retail Client Analytics (`/client`)**: Store-level gadget sales velocity, profit/loss breakdown, deadstock indicators, and PDF/CSV report exports.
4. **ML Predictive Engine (`/predictions`)**: XGBoost & Random Forest time-series forecasting, 7-14 day stockout risk predictions, and exact recommended replenishment calculations.
5. **QR Code Logistics Tracking (`/track/:hash`)**: Cryptographic order tracking with public QR lookup and confidential commercial data redaction.
6. **RMA & Defect Hub (`/client/rma`, `/supplier/rma`)**: Grievance ticketing workflow for transit damage and defective electronics.
7. **Conversational AI Analytics (`/client/assistant`, `/supplier/assistant`)**: Zero-cost, zero-LLM MongoDB aggregation chips enforcing strict tenant filtering.
