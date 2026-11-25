import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/customers", tags=["Customer Management"])

class CustomerCreateUpdate(BaseModel):
    company_name: str
    contact_person: str
    email: str
    phone: str
    whatsapp_number: str
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    credit_limit: Optional[float] = 0.0
    payment_terms_days: Optional[int] = 30
    notes: Optional[str] = None

@router.get("")
def list_customers(
    business_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        c.*,
        COALESCE(SUM(i.remaining_amount), 0) as total_outstanding,
        COUNT(CASE WHEN i.remaining_amount > 0 AND i.due_date < DATE('now') THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN i.remaining_amount > 0 AND i.due_date < DATE('now') THEN i.remaining_amount ELSE 0 END), 0) as total_overdue
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id
    WHERE c.business_id = ?
    """
    params = [business_id]

    if search:
        query += " AND (LOWER(c.company_name) LIKE ? OR LOWER(c.contact_person) LIKE ? OR c.phone LIKE ?)"
        s = f"%{search.lower()}%"
        params.extend([s, s, s])

    if status == "active":
        query += " AND c.is_active = 1"
    elif status == "inactive":
        query += " AND c.is_active = 0"

    query += " GROUP BY c.id ORDER BY total_overdue DESC, c.company_name ASC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.get("/{customer_id}")
def get_customer_profile(customer_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Customer Info
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    customer = cursor.fetchone()
    if not customer:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    customer_dict = dict(customer)

    # 2. Invoices linked
    cursor.execute("""
    SELECT * FROM invoices 
    WHERE customer_id = ? 
    ORDER BY due_date DESC
    """, (customer_id,))
    customer_dict["invoices"] = [dict(r) for r in cursor.fetchall()]

    # 3. Payments made
    cursor.execute("""
    SELECT p.*, i.invoice_number FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.customer_id = ?
    ORDER BY p.payment_date DESC
    """, (customer_id,))
    customer_dict["payments"] = [dict(r) for r in cursor.fetchall()]

    # 4. Promises
    cursor.execute("""
    SELECT p.*, i.invoice_number FROM payment_promises p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.customer_id = ?
    ORDER BY p.promised_date DESC
    """, (customer_id,))
    customer_dict["promises"] = [dict(r) for r in cursor.fetchall()]

    # 5. Communication logs
    cursor.execute("""
    SELECT * FROM communication_logs
    WHERE customer_id = ?
    ORDER BY created_at DESC
    """, (customer_id,))
    customer_dict["communications"] = [dict(r) for r in cursor.fetchall()]

    # Compute Total Outstanding & Overdue
    total_out = sum(inv["remaining_amount"] for inv in customer_dict["invoices"])
    customer_dict["total_outstanding"] = total_out

    conn.close()
    return customer_dict

@router.post("")
def create_customer(req: CustomerCreateUpdate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    cid = f"cust_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO customers (
        id, business_id, company_name, contact_person, email, phone,
        whatsapp_number, billing_address, city, state, gstin,
        credit_limit, payment_terms_days, notes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    """, (
        cid, business_id, req.company_name, req.contact_person, req.email, req.phone,
        req.whatsapp_number, req.billing_address, req.city, req.state, req.gstin,
        req.credit_limit, req.payment_terms_days, req.notes, now, now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "id": cid, "message": "Customer created successfully"}

@router.put("/{customer_id}")
def update_customer(customer_id: str, req: CustomerCreateUpdate):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    UPDATE customers SET
        company_name = ?,
        contact_person = ?,
        email = ?,
        phone = ?,
        whatsapp_number = ?,
        billing_address = ?,
        city = ?,
        state = ?,
        gstin = ?,
        credit_limit = ?,
        payment_terms_days = ?,
        notes = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        req.company_name, req.contact_person, req.email, req.phone,
        req.whatsapp_number, req.billing_address, req.city, req.state, req.gstin,
        req.credit_limit, req.payment_terms_days, req.notes, now, customer_id
    ))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Customer updated successfully"}

@router.delete("/{customer_id}")
def delete_customer(customer_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check for active invoices
    cursor.execute("SELECT COUNT(*) as active_inv FROM invoices WHERE customer_id = ? AND remaining_amount > 0", (customer_id,))
    if cursor.fetchone()["active_inv"] > 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete customer with active outstanding invoices.")

    cursor.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    conn.commit()
    conn.close()

    return {"success": True, "message": "Customer deleted successfully"}
