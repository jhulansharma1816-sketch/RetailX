import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/invoices", tags=["Invoice Management"])

class InvoiceCreateUpdate(BaseModel):
    customer_id: str
    invoice_number: str
    issue_date: str
    due_date: str
    total_amount: float
    tax_amount: Optional[float] = 0.0
    description: Optional[str] = None
    attachment_url: Optional[str] = None

@router.get("")
def list_invoices(
    business_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        i.*,
        c.company_name,
        c.contact_person,
        c.phone as customer_phone,
        c.whatsapp_number as customer_whatsapp,
        (SELECT COUNT(*) FROM payment_promises p WHERE p.invoice_id = i.id AND p.status = 'missed') as missed_promises_count,
        (SELECT COUNT(*) FROM disputes d WHERE d.invoice_id = i.id AND d.status IN ('open', 'under_review')) as open_disputes_count
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.business_id = ?
    """
    params = [business_id]

    if status and status != "all":
        query += " AND i.status = ?"
        params.append(status)

    if customer_id:
        query += " AND i.customer_id = ?"
        params.append(customer_id)

    if search:
        query += " AND (LOWER(i.invoice_number) LIKE ? OR LOWER(c.company_name) LIKE ? OR LOWER(i.description) LIKE ?)"
        s = f"%{search.lower()}%"
        params.extend([s, s, s])

    query += " ORDER BY i.due_date ASC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.get("/{invoice_id}")
def get_invoice_details(invoice_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT i.*, c.company_name, c.contact_person, c.phone, c.email, c.whatsapp_number, c.billing_address
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
    """, (invoice_id,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    inv_dict = dict(inv)

    # Linked payments
    cursor.execute("SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC", (invoice_id,))
    inv_dict["payments"] = [dict(r) for r in cursor.fetchall()]

    # Linked promises
    cursor.execute("SELECT * FROM payment_promises WHERE invoice_id = ? ORDER BY promised_date DESC", (invoice_id,))
    inv_dict["promises"] = [dict(r) for r in cursor.fetchall()]

    # Linked disputes
    cursor.execute("SELECT * FROM disputes WHERE invoice_id = ?", (invoice_id,))
    inv_dict["disputes"] = [dict(r) for r in cursor.fetchall()]

    # Linked communications
    cursor.execute("SELECT * FROM communication_logs WHERE invoice_id = ? ORDER BY created_at DESC", (invoice_id,))
    inv_dict["communications"] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return inv_dict

@router.post("")
def create_invoice(req: InvoiceCreateUpdate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    # Validation: Amount > 0
    if req.total_amount <= 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Total invoice amount must be greater than zero.")

    # Validation: Duplicate invoice number
    cursor.execute("SELECT id FROM invoices WHERE business_id = ? AND UPPER(invoice_number) = UPPER(?)", (business_id, req.invoice_number.strip()))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"Invoice number '{req.invoice_number}' already exists.")

    today = datetime.date.today()
    due_d = datetime.date.fromisoformat(req.due_date)
    initial_status = "overdue" if due_d < today else "sent"

    inv_id = f"inv_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO invoices (
        id, business_id, customer_id, invoice_number, issue_date,
        due_date, total_amount, paid_amount, remaining_amount, tax_amount,
        currency, status, description, attachment_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, 'INR', ?, ?, ?, ?, ?)
    """, (
        inv_id, business_id, req.customer_id, req.invoice_number.strip().upper(),
        req.issue_date, req.due_date, req.total_amount, req.total_amount,
        req.tax_amount or 0.0, initial_status, req.description,
        req.attachment_url, now, now
    ))

    # Audit log
    cursor.execute("""
    INSERT INTO activity_logs (id, business_id, action, entity_type, entity_id, description, ip_address, created_at)
    VALUES (?, ?, 'Invoice created', 'invoice', ?, ?, '127.0.0.1', ?)
    """, (
        str(uuid.uuid4()), business_id, inv_id,
        f"Created invoice {req.invoice_number.upper()} for ₹{req.total_amount:,.2f}",
        now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "id": inv_id, "message": "Invoice created successfully"}

@router.put("/{invoice_id}")
def update_invoice(invoice_id: str, req: InvoiceCreateUpdate):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT paid_amount FROM invoices WHERE id = ?", (invoice_id,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    paid_amt = float(inv["paid_amount"])
    if req.total_amount < paid_amt:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Total amount cannot be less than already paid amount of ₹{paid_amt:,.2f}.")

    rem_amt = req.total_amount - paid_amt
    today = datetime.date.today()
    due_d = datetime.date.fromisoformat(req.due_date)

    if rem_amt == 0:
        new_status = "paid"
    elif paid_amt > 0:
        new_status = "partially_paid"
    elif due_d < today:
        new_status = "overdue"
    else:
        new_status = "sent"

    cursor.execute("""
    UPDATE invoices SET
        customer_id = ?,
        invoice_number = ?,
        issue_date = ?,
        due_date = ?,
        total_amount = ?,
        remaining_amount = ?,
        tax_amount = ?,
        description = ?,
        attachment_url = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        req.customer_id, req.invoice_number.strip().upper(), req.issue_date,
        req.due_date, req.total_amount, rem_amt, req.tax_amount or 0.0,
        req.description, req.attachment_url, new_status, now, invoice_id
    ))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Invoice updated successfully"}

@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT paid_amount FROM invoices WHERE id = ?", (invoice_id,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    if float(inv["paid_amount"]) > 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete invoice with recorded payments.")

    cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Invoice deleted successfully"}
