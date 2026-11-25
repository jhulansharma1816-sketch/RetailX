import io
import uuid
import datetime
import pandas as pd
from typing import Dict, Any, List, Optional
from backend.app.core.database import get_db_connection

def parse_and_validate_import_file(
    file_bytes: bytes,
    file_name: str,
    business_id: str,
    commit: bool = False
) -> Dict[str, Any]:
    """
    Parses and validates CSV and Excel invoices using Pandas (Section 6).
    Detects duplicates, validates amounts and dates, and provides row-by-row reporting.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        if file_name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif file_name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            return {"success": False, "error": "Unsupported file format. Please upload .csv, .xlsx, or .xls"}
    except Exception as e:
        return {"success": False, "error": f"Failed to parse file: {str(e)}"}

    # Normalize column names: lowercase, strip, remove special characters
    normalized_cols = {col: str(col).lower().replace("_", " ").strip() for col in df.columns}
    df = df.rename(columns=normalized_cols)

    # Standard column alias mapping
    col_map = {
        "company_name": ["company name", "customer name", "customer", "client", "buyer"],
        "contact_person": ["contact person", "contact", "person", "attn"],
        "email": ["email", "email address", "mail"],
        "phone": ["phone", "mobile", "contact number", "telephone"],
        "whatsapp_number": ["whatsapp", "whatsapp number", "wa number"],
        "invoice_number": ["invoice number", "invoice no", "inv no", "invoice #", "bill no"],
        "total_amount": ["total amount", "amount", "invoice amount", "bill amount", "total"],
        "issue_date": ["issue date", "invoice date", "bill date", "date"],
        "due_date": ["due date", "payment due date", "due"]
    }

    field_resolved = {}
    for target, aliases in col_map.items():
        matched = None
        for col in df.columns:
            if col in aliases or any(a in col for a in aliases):
                matched = col
                break
        field_resolved[target] = matched

    # Verify critical columns
    missing = []
    for req in ["company_name", "invoice_number", "total_amount", "due_date"]:
        if not field_resolved.get(req):
            missing.append(req.replace("_", " ").title())

    if missing:
        return {
            "success": False,
            "error": f"Missing mandatory columns: {', '.join(missing)}. Available columns: {list(df.columns)}"
        }

    conn = get_db_connection()
    cursor = conn.cursor()

    # Pre-fetch existing invoice numbers and customers for duplicate checks
    cursor.execute("SELECT invoice_number FROM invoices WHERE business_id = ?", (business_id,))
    existing_invoices = set(r["invoice_number"].strip().upper() for r in cursor.fetchall())

    cursor.execute("SELECT id, LOWER(company_name) as name FROM customers WHERE business_id = ?", (business_id,))
    existing_customers = {r["name"]: r["id"] for r in cursor.fetchall()}

    valid_rows = []
    error_rows = []
    duplicate_rows = []

    today = datetime.date.today()

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel 1-indexed header + row offset
        errors = []

        raw_company = str(row.get(field_resolved["company_name"], "")).strip()
        raw_inv_num = str(row.get(field_resolved["invoice_number"], "")).strip().upper()
        raw_amount = row.get(field_resolved["total_amount"])
        raw_due_date = row.get(field_resolved["due_date"])
        raw_issue_date = row.get(field_resolved["issue_date"]) if field_resolved.get("issue_date") else None
        raw_phone = str(row.get(field_resolved["phone"], "")).strip() if field_resolved.get("phone") else "+91 99999 00000"
        raw_email = str(row.get(field_resolved["email"], "")).strip() if field_resolved.get("email") else "accounts@customer.com"
        raw_contact = str(row.get(field_resolved["contact_person"], "")).strip() if field_resolved.get("contact_person") else raw_company

        # Validation 1: Customer Name
        if not raw_company or raw_company.lower() in ["nan", "none"]:
            errors.append("Customer/Company name is required.")

        # Validation 2: Invoice Number
        if not raw_inv_num or raw_inv_num.lower() in ["nan", "none"]:
            errors.append("Invoice number is required.")
        elif raw_inv_num in existing_invoices:
            duplicate_rows.append({"row": row_num, "invoice_number": raw_inv_num, "reason": "Invoice number already exists in database"})
            continue

        # Validation 3: Amount
        try:
            amount = float(str(raw_amount).replace(",", "").replace("₹", "").replace("$", ""))
            if amount <= 0:
                errors.append("Amount must be greater than zero.")
        except Exception:
            errors.append(f"Invalid amount value: '{raw_amount}'. Must be a valid numeric value.")
            amount = 0.0

        # Validation 4: Dates
        try:
            if isinstance(raw_due_date, (pd.Timestamp, datetime.date, datetime.datetime)):
                parsed_due_date = pd.to_datetime(raw_due_date).date().isoformat()
            else:
                parsed_due_date = pd.to_datetime(str(raw_due_date)).date().isoformat()
        except Exception:
            errors.append(f"Invalid due date: '{raw_due_date}'. Expected YYYY-MM-DD or DD/MM/YYYY.")
            parsed_due_date = today.isoformat()

        try:
            if raw_issue_date and not pd.isna(raw_issue_date):
                parsed_issue_date = pd.to_datetime(raw_issue_date).date().isoformat()
            else:
                parsed_issue_date = (datetime.date.fromisoformat(parsed_due_date) - datetime.timedelta(days=30)).isoformat()
        except Exception:
            parsed_issue_date = (datetime.date.fromisoformat(parsed_due_date) - datetime.timedelta(days=30)).isoformat()

        if errors:
            error_rows.append({"row": row_num, "invoice_number": raw_inv_num, "errors": errors})
        else:
            # Determine invoice status based on due date
            due_d = datetime.date.fromisoformat(parsed_due_date)
            status = "overdue" if due_d < today else "sent"

            valid_rows.append({
                "row": row_num,
                "company_name": raw_company,
                "contact_person": raw_contact,
                "email": raw_email,
                "phone": raw_phone,
                "invoice_number": raw_inv_num,
                "total_amount": amount,
                "remaining_amount": amount,
                "issue_date": parsed_issue_date,
                "due_date": parsed_due_date,
                "status": status
            })

    # If commit is True and valid rows exist, save to database
    imported_count = 0
    if commit and valid_rows:
        for r in valid_rows:
            comp_key = r["company_name"].lower()
            if comp_key in existing_customers:
                cid = existing_customers[comp_key]
            else:
                cid = f"cust_{uuid.uuid4().hex[:8]}"
                cursor.execute("""
                INSERT INTO customers (id, business_id, company_name, contact_person, email, phone, whatsapp_number, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """, (cid, business_id, r["company_name"], r["contact_person"], r["email"], r["phone"], r["phone"], now, now))
                existing_customers[comp_key] = cid

            inv_id = f"inv_{uuid.uuid4().hex[:8]}"
            cursor.execute("""
            INSERT INTO invoices (id, business_id, customer_id, invoice_number, issue_date, due_date, total_amount, paid_amount, remaining_amount, tax_amount, currency, status, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, 0.0, 'INR', ?, 'Imported via Batch File', ?, ?)
            """, (inv_id, business_id, cid, r["invoice_number"], r["issue_date"], r["due_date"], r["total_amount"], r["remaining_amount"], r["status"], now, now))
            
            existing_invoices.add(r["invoice_number"])
            imported_count += 1

        conn.commit()

    conn.close()

    return {
        "success": True,
        "total_rows": len(df),
        "valid_count": len(valid_rows),
        "error_count": len(error_rows),
        "duplicate_count": len(duplicate_rows),
        "imported_count": imported_count if commit else 0,
        "is_preview": not commit,
        "valid_records_preview": valid_rows[:15],
        "errors": error_rows,
        "duplicates": duplicate_rows
    }
