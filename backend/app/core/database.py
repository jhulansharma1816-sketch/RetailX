import sqlite3
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from backend.app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    """Provides a SQLite connection with row factory enabled."""
    conn = sqlite3.connect(settings.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Initializes all 19 database tables mirroring Supabase PostgreSQL schema."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    -- 1. Profiles
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        phone TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- 2. Businesses
    CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        business_type TEXT NOT NULL DEFAULT 'Wholesale / Distribution',
        gstin TEXT,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'India',
        postal_code TEXT,
        currency TEXT NOT NULL DEFAULT 'INR',
        settings TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- 3. Business Members
    CREATE TABLE IF NOT EXISTS business_members (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        status TEXT NOT NULL DEFAULT 'active',
        joined_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
        UNIQUE(business_id, user_id)
    );

    -- 4. Customers
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        whatsapp_number TEXT NOT NULL,
        billing_address TEXT,
        city TEXT,
        state TEXT,
        gstin TEXT,
        credit_limit REAL DEFAULT 0.0,
        payment_terms_days INTEGER DEFAULT 30,
        notes TEXT,
        tags TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 5. Invoices
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0.0,
        remaining_amount REAL NOT NULL,
        tax_amount REAL DEFAULT 0.0,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'sent',
        description TEXT,
        attachment_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        UNIQUE(business_id, invoice_number)
    );

    -- 6. Payments
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        payment_number TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
        transaction_reference TEXT,
        notes TEXT,
        recorded_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT
    );

    -- 7. Payment Promises
    CREATE TABLE IF NOT EXISTS payment_promises (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        promised_amount REAL NOT NULL,
        promised_date TEXT NOT NULL,
        commitment_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        fulfilled_at TEXT,
        recorded_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- 8. Recovery Tasks
    CREATE TABLE IF NOT EXISTS recovery_tasks (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT,
        title TEXT NOT NULL,
        task_type TEXT NOT NULL DEFAULT 'whatsapp',
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT NOT NULL,
        assigned_to TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        outcome_notes TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    -- 9. Disputes
    CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        dispute_number TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        disputed_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        assigned_to TEXT,
        resolution_notes TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- 10. Dispute Documents
    CREATE TABLE IF NOT EXISTS dispute_documents (
        id TEXT PRIMARY KEY,
        dispute_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        uploaded_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
    );

    -- 11. Reminder Rules
    CREATE TABLE IF NOT EXISTS reminder_rules (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        days_offset INTEGER NOT NULL DEFAULT 0,
        channels TEXT NOT NULL DEFAULT '["whatsapp", "email"]',
        is_active INTEGER NOT NULL DEFAULT 1,
        max_frequency_days INTEGER DEFAULT 3,
        working_hours_start TEXT DEFAULT '09:00:00',
        working_hours_end TEXT DEFAULT '19:00:00',
        timezone TEXT DEFAULT 'Asia/Kolkata',
        exclude_disputed INTEGER DEFAULT 1,
        stop_on_paid INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 12. Message Templates
    CREATE TABLE IF NOT EXISTS message_templates (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT,
        body TEXT NOT NULL,
        dlt_template_id TEXT,
        dlt_sender_id TEXT,
        variables TEXT DEFAULT '[]',
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 13. Communication Logs
    CREATE TABLE IF NOT EXISTS communication_logs (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        subject_or_title TEXT,
        message_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        provider_message_id TEXT,
        provider_response TEXT DEFAULT '{}',
        response_text TEXT,
        follow_up_action TEXT,
        is_demo INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    -- 14. Voice Call Logs
    CREATE TABLE IF NOT EXISTS voice_call_logs (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        invoice_id TEXT,
        phone_number TEXT NOT NULL,
        script_used TEXT NOT NULL,
        audio_url TEXT,
        transcript TEXT,
        detected_intent TEXT,
        outcome TEXT,
        duration_seconds INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'completed',
        is_demo INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    -- 15. Chatbot Conversations
    CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Recovery Chat Session',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    -- 16. Chatbot Messages
    CREATE TABLE IF NOT EXISTS chatbot_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE
    );

    -- 17. Integrations
    CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        is_demo_mode INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'not_connected',
        config TEXT DEFAULT '{}',
        last_synced_at TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE(business_id, provider)
    );

    -- 18. Notification Preferences
    CREATE TABLE IF NOT EXISTS notification_preferences (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        email_on_payment INTEGER DEFAULT 1,
        email_on_promise_missed INTEGER DEFAULT 1,
        email_on_dispute INTEGER DEFAULT 1,
        whatsapp_digest_daily INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        UNIQUE(business_id, user_id)
    );

    -- 19. Activity Logs
    CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        description TEXT NOT NULL,
        ip_address TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    """)

    conn.commit()

    # Seed demo data if database is fresh
    cursor.execute("SELECT COUNT(*) as count FROM businesses")
    if cursor.fetchone()["count"] == 0:
        seed_demo_data(cursor)
        conn.commit()

    conn.close()

def seed_demo_data(cursor: sqlite3.Cursor):
    """Seeds realistic fictional B2B demonstration data (Section 20)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    today = datetime.date.today()

    # 1. Default Business
    b_id = "biz-apex-001"
    u_id = "usr-rajesh-001"

    cursor.execute("""
    INSERT INTO businesses (id, name, business_type, gstin, phone, email, address, city, state, country, postal_code, currency, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        b_id,
        "Apex Industrial & Electrical Distribution Pvt Ltd",
        "Wholesale & Industrial Distribution",
        "27AABCA1234F1Z8",
        "+91 98201 12345",
        "billing@apexindustrial.in",
        "Plot 42, MIDC Industrial Area, Andheri East",
        "Mumbai",
        "Maharashtra",
        "India",
        "400093",
        "INR",
        json.dumps({
            "auto_reminders_enabled": True,
            "max_reminders_per_week": 2,
            "dnd_start": "20:00",
            "dnd_end": "09:00",
            "reminder_channels": ["whatsapp", "email", "sms"]
        }),
        now_str,
        now_str
    ))

    # 2. Profiles & Member
    cursor.execute("""
    INSERT INTO profiles (id, email, full_name, role, phone, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        u_id,
        "admin@apexindustrial.in",
        "Rajesh Kumar (Credit & Recovery Head)",
        "owner",
        "+91 98201 12345",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        now_str,
        now_str
    ))

    cursor.execute("""
    INSERT INTO business_members (id, business_id, user_id, role, status, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()),
        b_id,
        u_id,
        "owner",
        "active",
        now_str
    ))

    # 3. 10 Realistic B2B Customers
    customers_data = [
        ("cust-001", "ABC Traders & Hardware", "Suresh Patel", "suresh@abctraders.in", "+91 98210 23456", "+91 98210 23456", "GIDC Estate, Vatva", "Ahmedabad", "Gujarat", "24AAACA1111A1Z1", 100000.0, 30, "High volume buyer of switchgear and circuit breakers. Recently delayed payments due to local project hold."),
        ("cust-002", "Sharma Distributors & Logistics", "Vikram Sharma", "accounts@sharmadist.com", "+91 98111 34567", "+91 98111 34567", "Transport Nagar, Azadpur", "Delhi", "Delhi", "07AABCS2222B1Z2", 75000.0, 21, "Follow up strictly on WhatsApp. Promised payment last week but missed due date."),
        ("cust-003", "RK Enterprises & Buildware", "Ramesh Kulkarni", "ramesh@rkbuild.co.in", "+91 98800 45678", "+91 98800 45678", "Peenya 2nd Stage", "Bengaluru", "Karnataka", "29AABCR3333C1Z3", 50000.0, 30, "Contractor for metro civil works. Requires physical payment receipt before clearing payments."),
        ("cust-004", "Metro Electricals Corporation", "Anand Deshmukh", "purchase@metroelec.in", "+91 98222 56789", "+91 98222 56789", "Bhosari MIDC", "Pune", "Maharashtra", "27AABCM4444D1Z4", 250000.0, 45, "Partial payment received. Regularly pays remaining balance within 15 days of reminder."),
        ("cust-005", "Modern Retail Chain Ltd", "Priya Nair", "finance@modernretail.in", "+91 98490 67890", "+91 98490 67890", "Hitech City, Madhapur", "Hyderabad", "Telangana", "36AABCM5555E1Z5", 500000.0, 60, "Corporate account with ERP payment batches on every alternate Friday."),
        ("cust-006", "Zenith Auto Components", "K. Murugan", "murugan@zenithauto.co", "+91 98401 78901", "+91 98401 78901", "Ambattur Industrial Estate", "Chennai", "Tamil Nadu", "33AABCZ6666F1Z6", 150000.0, 30, "Raised dispute regarding price mismatch on Invoice INV-2026-006. Reminders temporarily paused."),
        ("cust-007", "Shree Ganesh Spares & Machinery", "Dinesh Agrawal", "dinesh@shreeganeshspares.com", "+91 98260 89012", "+91 98260 89012", "Sanwer Road Industrial Area", "Indore", "Madhya Pradesh", "23AABCS7777G1Z7", 100000.0, 15, "Long overdue. Calls frequently go unanswered. Recommended for polite AI Voice reminder."),
        ("cust-008", "Bharat Steels & Fabrication", "Mahendra Singh", "mahendra@bharatsteel.net", "+91 98290 90123", "+91 98290 90123", "Vishwakarma Industrial Area", "Jaipur", "Rajasthan", "08AABCB8888H1Z8", 200000.0, 30, "Payment promise recorded for coming Friday. Awaiting RTGS transfer."),
        ("cust-009", "Dynamic Polychem Industries", "Subhash Mukherjee", "accounts@dynamicpoly.com", "+91 98300 01234", "+91 98300 01234", "Taratala Road", "Kolkata", "West Bengal", "19AABCD9999I1Z9", 150000.0, 30, "Recent payment of ₹50,000 received. Balance ₹45,000 due soon."),
        ("cust-010", "Golden Gate Supermart Pvt Ltd", "Bhavin Shah", "accounts@goldengate.store", "+91 98250 12340", "+91 98250 12340", "Ring Road, Surat Textile Market", "Surat", "Gujarat", "24AABCG0000J1Z0", 300000.0, 30, "A-Grade credit score debtor. Consistently pays invoices on time.")
    ]

    for cid, name, person, email, phone, wa, addr, city, state, gstin, limit, terms, notes in customers_data:
        cursor.execute("""
        INSERT INTO customers (id, business_id, company_name, contact_person, email, phone, whatsapp_number, billing_address, city, state, gstin, credit_limit, payment_terms_days, notes, tags, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cid, b_id, name, person, email, phone, wa, addr, city, state, gstin, limit, terms, notes,
            json.dumps(["B2B", "Direct-Wholesale"]), 1, now_str, now_str
        ))

    # 4. 20 Invoices across Ageing & Statuses
    # We create dates relative to today:
    def dt(offset_days: int) -> str:
        return (today + datetime.timedelta(days=offset_days)).isoformat()

    invoices_data = [
        # cust-001 (High Overdue - 35 days)
        ("inv-001", "cust-001", "INV-2026-001", dt(-65), dt(-35), 75000.0, 0.0, 75000.0, 13500.0, "overdue", "Industrial 3-Phase Switchboards (Batch #441)"),
        ("inv-002", "cust-001", "INV-2026-002", dt(-20), dt(10), 32000.0, 0.0, 32000.0, 5760.0, "sent", "Copper Busbars & Terminal Accessories"),

        # cust-002 (21 days overdue, missed promise)
        ("inv-003", "cust-002", "INV-2026-003", dt(-51), dt(-21), 42000.0, 0.0, 42000.0, 7560.0, "overdue", "Heavy Duty Conduit Pipes & Junction Fittings"),

        # cust-003 (28 days overdue, 1 missed promise)
        ("inv-004", "cust-003", "INV-2026-004", dt(-58), dt(-28), 28000.0, 0.0, 28000.0, 5040.0, "overdue", "Armoured Power Cable 4-Core 16sqmm (200m)"),

        # cust-004 (Partially paid, 12 days overdue)
        ("inv-005", "cust-004", "INV-2026-005", dt(-57), dt(-12), 120000.0, 45000.0, 75000.0, 21600.0, "partially_paid", "LED High-Bay Industrial Lighting Fixtures"),
        ("inv-006", "cust-004", "INV-2026-006", dt(-10), dt(20), 48000.0, 0.0, 48000.0, 8640.0, "sent", "MCB Distribution Boards 12-Way Double Door"),

        # cust-005 (Due soon in 4 days)
        ("inv-007", "cust-005", "INV-2026-007", dt(-56), dt(4), 210000.0, 0.0, 210000.0, 37800.0, "sent", "Bulk Consignment Commercial Wiring Cables"),

        # cust-006 (Disputed invoice)
        ("inv-008", "cust-006", "INV-2026-008", dt(-45), dt(-15), 88000.0, 0.0, 88000.0, 15840.0, "disputed", "Precision Relay Modules & Contactors"),

        # cust-007 (High overdue - 45 days)
        ("inv-009", "cust-007", "INV-2026-009", dt(-60), dt(-45), 64000.0, 0.0, 64000.0, 11520.0, "overdue", "Electric Motor Rewinding Wire Spools & Starters"),

        # cust-008 (15 days overdue with upcoming promise)
        ("inv-010", "cust-008", "INV-2026-010", dt(-45), dt(-15), 145000.0, 0.0, 145000.0, 26100.0, "overdue", "Industrial Substation Earthing Electrodes"),
        ("inv-011", "cust-008", "INV-2026-011", dt(-5), dt(25), 55000.0, 0.0, 55000.0, 9900.0, "sent", "Lightning Arresters & Surge Protection Units"),

        # cust-009 (Partially paid, balance ₹45,000)
        ("inv-012", "cust-009", "INV-2026-012", dt(-35), dt(-5), 95000.0, 50000.0, 45000.0, 17100.0, "partially_paid", "Chemical Resistant Flexible Conduit Ducts"),

        # cust-010 (Healthy account, fully paid + due in 10 days)
        ("inv-013", "cust-010", "INV-2026-013", dt(-40), dt(-10), 180000.0, 180000.0, 0.0, 32400.0, "paid", "Commercial Complex Sub-metering Units"),
        ("inv-014", "cust-010", "INV-2026-014", dt(-20), dt(10), 85000.0, 0.0, 85000.0, 15300.0, "sent", "Fire Alarm Sensor Cabling & Panels"),

        # Additional Invoices for Ageing and Analytics
        ("inv-015", "cust-001", "INV-2026-015", dt(-90), dt(-60), 92000.0, 92000.0, 0.0, 16560.0, "paid", "Quarterly Annual Maintenance Consumables"),
        ("inv-016", "cust-002", "INV-2026-016", dt(-80), dt(-50), 38000.0, 38000.0, 0.0, 6840.0, "paid", "Warehouse High Bay Lighting Spares"),
        ("inv-017", "cust-003", "INV-2026-017", dt(-15), dt(15), 19500.0, 0.0, 19500.0, 3510.0, "sent", "Submersible Pump Control Panels"),
        ("inv-018", "cust-004", "INV-2026-018", dt(-75), dt(-45), 62000.0, 62000.0, 0.0, 11160.0, "paid", "Solar Inverter Connectivity Cable Sets"),
        ("inv-019", "cust-005", "INV-2026-019", dt(-10), dt(20), 110000.0, 0.0, 110000.0, 19800.0, "sent", "Automated Motion Sensor Switches (500 units)"),
        ("inv-020", "cust-007", "INV-2026-020", dt(-95), dt(-65), 52000.0, 52000.0, 0.0, 9360.0, "paid", "Heavy Machinery Transformer Oil (4 Barrels)")
    ]

    for iid, cid, num, idt, ddt, tot, paid, rem, tax, status, desc in invoices_data:
        cursor.execute("""
        INSERT INTO invoices (id, business_id, customer_id, invoice_number, issue_date, due_date, total_amount, paid_amount, remaining_amount, tax_amount, currency, status, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            iid, b_id, cid, num, idt, ddt, tot, paid, rem, tax, "INR", status, desc, now_str, now_str
        ))

    # 5. Payments
    payments_data = [
        ("pay-001", "cust-004", "inv-005", "PAY-2026-001", 45000.0, dt(-8), "bank_transfer", "NEFT/SBIN0029384/PUNE", "First instalment paid by NEFT, balance promised next week."),
        ("pay-002", "cust-009", "inv-012", "PAY-2026-002", 50000.0, dt(-2), "upi", "UPI/612984920192@hdfcbank", "Direct UPI advance against invoice."),
        ("pay-003", "cust-010", "inv-013", "PAY-2026-003", 180000.0, dt(-9), "bank_transfer", "RTGS/HDFC0001234/SURAT", "Full clearance before grace period expiry."),
        ("pay-004", "cust-001", "inv-015", "PAY-2026-004", 92000.0, dt(-59), "cheque", "CHQ#882910/SBI", "Cleared on presentation."),
        ("pay-005", "cust-002", "inv-016", "PAY-2026-005", 38000.0, dt(-48), "bank_transfer", "IMPS/ICIC992019/DELHI", "Cleared online."),
        ("pay-006", "cust-004", "inv-018", "PAY-2026-006", 62000.0, dt(-44), "bank_transfer", "NEFT/KKBK11928/PUNE", "Quarterly settlement."),
        ("pay-007", "cust-007", "inv-020", "PAY-2026-007", 52000.0, dt(-64), "bank_transfer", "RTGS/PUNB88201/INDORE", "Factory purchase settlement.")
    ]

    for pid, cid, iid, pnum, amt, pdt, meth, ref, notes in payments_data:
        cursor.execute("""
        INSERT INTO payments (id, business_id, customer_id, invoice_id, payment_number, amount, payment_date, payment_method, transaction_reference, notes, recorded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (pid, b_id, cid, iid, pnum, amt, pdt, meth, ref, notes, u_id, now_str))

    # 6. Payment Promises
    promises_data = [
        ("prm-001", "cust-001", "inv-001", 75000.0, dt(-10), "Customer promised RTGS payment after client project handover.", "missed", None),
        ("prm-002", "cust-001", "inv-001", 75000.0, dt(-3), "Promised second commitment after phone reminder. Still unfulfilled.", "missed", None),
        ("prm-003", "cust-002", "inv-003", 42000.0, dt(-5), "Said cheque was dispatched from Delhi office, but not delivered.", "missed", None),
        ("prm-004", "cust-008", "inv-010", 145000.0, dt(3), "Owner Mahendra Singh committed payment on Friday morning.", "pending", None),
        ("pay-005", "cust-009", "inv-012", 45000.0, dt(5), "Will clear remaining balance via UPI once goods reach warehouse.", "pending", None),
        ("pay-006", "cust-010", "inv-013", 180000.0, dt(-9), "Committed to clear full bill on 10th. Fulfilled promptly.", "fulfilled", dt(-9))
    ]

    for prm_id, cid, iid, amt, pdt, notes, status, f_at in promises_data:
        cursor.execute("""
        INSERT INTO payment_promises (id, business_id, customer_id, invoice_id, promised_amount, promised_date, commitment_notes, status, fulfilled_at, recorded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (prm_id, b_id, cid, iid, amt, pdt, notes, status, f_at, u_id, now_str, now_str))

    # 7. Recovery Tasks
    tasks_data = [
        ("tsk-001", "cust-001", "inv-001", "Follow up with Suresh Patel regarding 2nd missed payment promise", "call", "urgent", dt(0), "Customer owes ₹75,000 for 35 days. Request firm RTGS date or escalate to sales director.", "pending"),
        ("tsk-002", "cust-002", "inv-003", "Send Formal WhatsApp Overdue Notice to Sharma Distributors", "whatsapp", "high", dt(1), "Invoice overdue by 21 days. Template Overdue_Tier2 to be dispatched.", "pending"),
        ("tsk-003", "cust-007", "inv-009", "Schedule AI Voice Polite Follow-up Call for Shree Ganesh Spares", "call", "high", dt(0), "Customer has been unresponsive to emails. Voice call reminder scheduled for 11:30 AM.", "pending"),
        ("tsk-004", "cust-006", "inv-008", "Review pricing mismatch dispute documents with Sales Manager", "dispute_resolution", "medium", dt(2), "Invoice INV-2026-008 claimed to have 5% extra discount. Check signed PO.", "in_progress")
    ]

    for tid, cid, iid, title, ttype, prio, due, notes, status in tasks_data:
        cursor.execute("""
        INSERT INTO recovery_tasks (id, business_id, customer_id, invoice_id, title, task_type, priority, due_date, assigned_to, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tid, b_id, cid, iid, title, ttype, prio, due, u_id, notes, status, now_str, now_str))

    # 8. Disputes
    cursor.execute("""
    INSERT INTO disputes (id, business_id, customer_id, invoice_id, dispute_number, category, description, disputed_amount, status, assigned_to, resolution_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "dsp-001",
        b_id,
        "cust-006",
        "inv-008",
        "DSP-2026-001",
        "pricing_error",
        "Customer claims agreed rate for precision relay modules was ₹79,200 (10% distributor discount) instead of ₹88,000 billed on INV-2026-008.",
        88000.0,
        "under_review",
        u_id,
        "Sales rep Rahul confirms PO had a special discount clause. Credit note of ₹8,800 is being drafted.",
        now_str,
        now_str
    ))

    # 9. Reminder Rules
    rules_data = [
        ("rul-001", "Pre-Due Friendly WhatsApp Alert", "before_due", -3, json.dumps(["whatsapp", "email"])),
        ("rul-002", "Due Date Official Reminder", "on_due", 0, json.dumps(["whatsapp", "email", "sms"])),
        ("rul-003", "Overdue Notice (Day +3)", "after_due", 3, json.dumps(["whatsapp", "email"])),
        ("rul-004", "Escalated Overdue Notice (Day +7)", "after_due", 7, json.dumps(["whatsapp", "email", "sms"])),
        ("rul-005", "Critical Overdue & Call Escalation (Day +15)", "after_due", 15, json.dumps(["whatsapp", "voice"])),
        ("rul-006", "Immediate Missed Promise Follow-up", "missed_promise", 1, json.dumps(["whatsapp", "sms"]))
    ]

    for rid, name, rtype, offset, chans in rules_data:
        cursor.execute("""
        INSERT INTO reminder_rules (id, business_id, name, rule_type, days_offset, channels, is_active, max_frequency_days, working_hours_start, working_hours_end, timezone, exclude_disputed, stop_on_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, 3, '09:00:00', '19:00:00', 'Asia/Kolkata', 1, 1, ?)
        """, (rid, b_id, name, rtype, offset, chans, now_str))

    # 10. Message Templates
    templates_data = [
        ("tpl-001", "whatsapp", "WhatsApp Friendly Reminder (Approved Template)", "Invoice Pending Reminder", "Hello {{customer_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} for ₹{{amount_due}} is pending.\n\nDue Date: {{due_date}}\n\nPlease let us know your expected payment date or share the transaction reference.\n\nThank you,\n{{business_name}}", "b2b_payment_reminder_v1", "APEXIN", 1),
        ("tpl-002", "whatsapp", "WhatsApp Escalated Overdue Reminder", "Overdue Payment Notice", "Dear {{customer_name}},\n\nYour invoice {{invoice_number}} of ₹{{amount_due}} is now {{days_overdue}} days overdue (Due date: {{due_date}}).\n\nKindly clear this payment today or reply with your confirmed payment commitment date.\n\nRegards,\n{{business_name}} Collections", "b2b_overdue_notice_v2", "APEXIN", 0),
        ("tpl-003", "sms", "SMS DLT Overdue Notice", None, "Dear {{customer_name}}, payment of Rs {{amount_due}} for inv {{invoice_number}} is overdue. Please settle via UPI/NEFT today. {{business_name}}", "DLT-110716182901", "RECVER", 1),
        ("tpl-004", "email", "Formal Email Overdue Notice", "Payment Reminder: Invoice {{invoice_number}} is overdue", "<p>Dear <strong>{{customer_name}}</strong>,</p><p>We hope this email finds you well.</p><p>This is a reminder that payment for invoice <strong>{{invoice_number}}</strong> amounting to <strong>₹{{amount_due}}</strong> was due on <strong>{{due_date}}</strong> ({{days_overdue}} days ago).</p><p>Please find the invoice summary attached. Kindly process this payment at your earliest convenience and email the payment confirmation receipt.</p><p>Best regards,<br><strong>{{business_name}}</strong><br>Finance & Credit Team</p>", None, None, 1),
        ("tpl-005", "voice", "AI Voice Polite Follow-up Script", None, "Hello, this is an automated payment assistant calling on behalf of {{business_name}}. We are calling regarding invoice {{invoice_number}} with an outstanding balance of ₹{{amount_due}}. Could you please let us know when we can expect the payment?", None, None, 1)
    ]

    for tpl_id, chan, name, subj, body, dlt_tpl, dlt_snd, is_def in templates_data:
        cursor.execute("""
        INSERT INTO message_templates (id, business_id, channel, name, subject, body, dlt_template_id, dlt_sender_id, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tpl_id, b_id, chan, name, subj, body, dlt_tpl, dlt_snd, is_def, now_str, now_str))

    # 11. Omnichannel Communication Logs
    comm_logs_data = [
        ("log-001", "cust-001", "inv-001", "whatsapp", "+91 98210 23456", "WhatsApp Overdue Reminder", "Hello Suresh Patel, invoice INV-2026-001 of ₹75,000 is 35 days overdue. Please let us know expected payment date.", "delivered", "wa-msg-88201", json.dumps({"status": "delivered"}), "Will transfer by Friday afternoon.", "Promise Recorded", 1),
        ("log-002", "cust-002", "inv-003", "email", "accounts@sharmadist.com", "Payment Reminder: Invoice INV-2026-003 is overdue", "Formal email notice sent with PDF attachment.", "delivered", "sendgrid-99201", json.dumps({"status": "opened"}), None, "Awaiting Response", 1),
        ("log-003", "cust-003", "inv-004", "sms", "+91 98800 45678", None, "Dear Ramesh Kulkarni, payment of Rs 28,000 for inv INV-2026-004 is overdue. Please settle via UPI/NEFT.", "delivered", "sms-gate-4410", json.dumps({"dlt_status": "DELIVRD"}), None, "Follow-up Scheduled", 1),
        ("log-004", "cust-007", "inv-009", "voice_call", "+91 98260 89012", "AI Voice Reminder Call", "Polite automated reminder placed regarding INV-2026-009 (₹64,000). Customer indicated they need another week.", "delivered", "voice-call-001", json.dumps({"duration": 34}), "Customer stated: 'I need another week to arrange funds.'", "Follow-up task created", 1)
    ]

    for lid, cid, iid, chan, recip, title, body, status, pmid, presp, resp, f_act, is_demo in comm_logs_data:
        cursor.execute("""
        INSERT INTO communication_logs (id, business_id, customer_id, invoice_id, channel, recipient, subject_or_title, message_body, status, provider_message_id, provider_response, response_text, follow_up_action, is_demo, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (lid, b_id, cid, iid, chan, recip, title, body, status, pmid, presp, resp, f_act, is_demo, now_str))

    # 12. Voice Call Logs
    cursor.execute("""
    INSERT INTO voice_call_logs (id, business_id, customer_id, invoice_id, phone_number, script_used, audio_url, transcript, detected_intent, outcome, duration_seconds, status, is_demo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "vlog-001",
        b_id,
        "cust-007",
        "inv-009",
        "+91 98260 89012",
        "Hello, this is an automated payment assistant calling on behalf of Apex Industrial. We are calling regarding invoice INV-2026-009 with an outstanding balance of ₹64,000. Could you please let us know when we can expect the payment?",
        None,
        "AI: Hello, this is an automated payment assistant calling on behalf of Apex Industrial... Could you please let us know when we can expect the payment?\nCustomer: Hello, yes Dinesh here. We had a slight delay in our payments from clients. I need another week to arrange the funds.\nAI: Thank you Mr. Dinesh. We have noted that you need one more week. A follow-up has been scheduled for next Tuesday. Have a great day.",
        "call_back_later",
        "follow_up_created",
        38,
        "completed",
        1,
        now_str
    ))

    # 13. Integrations (Clearly labeled Demo vs Live)
    integrations_data = [
        ("int-001", "whatsapp", 1, 1, "connected", json.dumps({"provider": "Meta WhatsApp Business Cloud API", "phone_number": "+91 98201 12345", "status": "Simulated Live Adapter (Demo Ready)"})),
        ("int-002", "sms", 1, 1, "connected", json.dumps({"provider": "Indian DLT SMS Gateway (Fast2SMS / ValueFirst)", "sender_id": "RECVER", "entity_id": "110716182901", "status": "DLT Template Ready (Demo Mode)"})),
        ("int-003", "email", 1, 1, "connected", json.dumps({"provider": "SMTP / SendGrid", "from_email": "billing@apexindustrial.in", "status": "Active"})),
        ("int-004", "voice", 1, 1, "connected", json.dumps({"provider": "Twilio / Exotel Telephony AI", "caller_id": "+91 22 6901 1234", "status": "Speech AI Engine Active (Demo Mode)"})),
        ("int-005", "llm", 1, 1, "connected", json.dumps({"provider": "Configurable LLM (Gemini / OpenAI)", "model": "gemini-1.5-flash", "status": "Rule-Grounded Hybrid Active"}))
    ]

    for int_id, prov, is_act, is_demo, status, cfg in integrations_data:
        cursor.execute("""
        INSERT INTO integrations (id, business_id, provider, is_active, is_demo_mode, status, config, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (int_id, b_id, prov, is_act, is_demo, status, cfg, now_str))

    # 14. Notification Preferences
    cursor.execute("""
    INSERT INTO notification_preferences (id, business_id, user_id, email_on_payment, email_on_promise_missed, email_on_dispute, whatsapp_digest_daily, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, 1, 1, ?, ?)
    """, (str(uuid.uuid4()), b_id, u_id, now_str, now_str))

    # 15. Activity Logs
    activity_entries = [
        ("Payment recorded", "payment", "pay-001", "Recorded payment of ₹45,000 for Metro Electricals Corporation (INV-2026-005). Remaining: ₹75,000."),
        ("Payment promise missed", "payment_promise", "prm-001", "ABC Traders missed promised payment date of ₹75,000. Priority escalated to High."),
        ("Dispute raised", "dispute", "dsp-001", "Dispute DSP-2026-001 raised on INV-2026-008 by Zenith Auto Components (Pricing Error)."),
        ("Voice Call completed", "voice_call", "vlog-001", "AI Voice reminder call placed to Shree Ganesh Spares. Outcome: Follow-up scheduled.")
    ]

    for action, etype, eid, desc in activity_entries:
        cursor.execute("""
        INSERT INTO activity_logs (id, business_id, user_id, action, entity_type, entity_id, description, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1', ?)
        """, (str(uuid.uuid4()), b_id, u_id, action, etype, eid, desc, now_str))
