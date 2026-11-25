# RetailX - Smart B2B Payment Recovery Platform

> **"From Payment Tracking to Intelligent Payment Recovery"**

An enterprise-grade, AI-powered B2B receivables and payment recovery SaaS platform built for wholesalers, distributors, manufacturers, and multi-location suppliers.

---

## 🌟 Key Features

### 1. 🤖 AI Recovery Assistant & Explainable Prioritization
- **Transparent Multi-factor Scoring:** Dynamically computes debtor risk based on days overdue, financial exposure, missed promises, dispute flags, and contact frequency.
- **Explainability Engine:** Every recommendation displays exactly *why* a customer received that priority (e.g. *"High Priority: Invoice is 35 days overdue, customer missed 2 previous commitments, and ₹75,000 remains outstanding"*).
- **Automated Next-Action Guidance:** Suggests optimal recovery channels (WhatsApp, phone escalation, courtesy email alert, dispute review).

### 2. 💬 Omnichannel Communication Hub
- **Meta WhatsApp Business API:** Send automated due date reminders, overdue notices, and payment receipts with approved templates.
- **DLT-Compliant SMS Gateway:** Indian market SMS adapter supporting DLT entity IDs and approved sender headers.
- **Transactional Email Service:** SMTP / SendGrid integration with HTML statements and attachment support.
- **Certified Demo Mode:** Transparent simulation for testing without live API credentials.

### 3. 📞 AI Voice Call Reminder System
- **Polite Automated Telephony:** Places automated calls with clear upfront AI disclosure.
- **Intent Recognition:** Understands debtor responses (*"will pay tomorrow"*, *"already paid"*, *"call me later"*, *"dispute raised"*, *"speak to human representative"*).
- **Auto-action Execution:** Automatically records payment promises, creates verification tasks, or flags invoice disputes.

### 4. 🧠 Grounded AI Recovery Chatbot
- Conversational analytics grounded in real database figures.
- Answers natural language questions regarding overdue totals, top debtors, missed promises, and draft personalized reminders.
- **Zero Hallucinations:** Strictly uses actual ledger records.

### 5. 📊 Core Financial SaaS Engine
- **Debtor CRM & Invoices:** Complete CRUD lifecycle with partial payment reconciliation and automatic balance recalculations.
- **Overpayment Prevention:** Strictly prevents accidental overpayment.
- **Payment Promise Tracking (PTP):** Automated detection of missed promises with escalation into the recovery worklist.
- **Dispute Management:** Flags commercial and price mismatch disputes, automatically pausing reminders until resolved.
- **Pandas CSV / Excel Importer:** Batch uploads with schema validation, duplicate detection, and row-by-row error reporting.
- **Analytics & Ageing Breakdown:** Interactive Recharts visualizing ageing matrix (0-15, 16-30, 31-60, 60+ days) and collection performance.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Canvas Confetti.
- **Backend:** FastAPI (Python 3.11), Pydantic v2, Pandas, OpenPyXL, Uvicorn.
- **Database:** Supabase PostgreSQL with full Row Level Security (RLS) policies + local SQLite hybrid engine.
- **Telephony & Messaging:** WhatsApp Cloud API, Twilio/Exotel Telephony Bridge, DLT SMS Gateway, SMTP.

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend will start at: `http://localhost:8000`  
Interactive API Docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: `http://localhost:5173`

### 3. Pre-seeded Demo Credentials
- **Email:** `admin@apexindustrial.in`
- **Password:** `password123`

---

## 🔒 Security & Data Isolation
- Business data isolation enforced through multi-tenant workspace separation.
- Safe credential management with server-side environment variables (`.env.example`).
- Comprehensive audit trails logged in `activity_logs`.
