import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/promises", tags=["Payment Promise Tracking"])

class PromiseCreate(BaseModel):
    customer_id: str
    invoice_id: str
    promised_amount: float
    promised_date: str
    commitment_notes: Optional[str] = None

class PromiseStatusUpdate(BaseModel):
    status: str  # "pending", "fulfilled", "missed", "rescheduled"
    notes: Optional[str] = None
    rescheduled_date: Optional[str] = None

@router.get("")
def list_promises(business_id: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    today = datetime.date.today().isoformat()
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Automatically identify missed promises: if promised_date < today and status is 'pending', update to 'missed'
    cursor.execute("""
    UPDATE payment_promises 
    SET status = 'missed', updated_at = ?
    WHERE business_id = ? AND status = 'pending' AND promised_date < ?
    """, (now_str, business_id, today))
    conn.commit()

    query = """
    SELECT 
        p.*,
        c.company_name,
        c.contact_person,
        c.phone,
        c.whatsapp_number,
        i.invoice_number,
        i.total_amount as invoice_total,
        i.remaining_amount as invoice_remaining,
        i.due_date as invoice_due_date
    FROM payment_promises p
    JOIN customers c ON p.customer_id = c.id
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.business_id = ?
    """
    params = [business_id]

    if status and status != "all":
        query += " AND p.status = ?"
        params.append(status)

    query += " ORDER BY p.promised_date ASC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.post("")
def record_promise(req: PromiseCreate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    if req.promised_amount <= 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Promised amount must be greater than zero.")

    p_id = f"prm_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO payment_promises (
        id, business_id, customer_id, invoice_id, promised_amount,
        promised_date, commitment_notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (
        p_id, business_id, req.customer_id, req.invoice_id,
        req.promised_amount, req.promised_date, req.commitment_notes, now, now
    ))

    # Audit log
    cursor.execute("""
    INSERT INTO activity_logs (id, business_id, action, entity_type, entity_id, description, ip_address, created_at)
    VALUES (?, ?, 'Payment promise recorded', 'payment_promise', ?, ?, '127.0.0.1', ?)
    """, (
        str(uuid.uuid4()), business_id, p_id,
        f"Recorded promise of ₹{req.promised_amount:,.2f} due on {req.promised_date}",
        now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "id": p_id, "message": "Payment promise recorded successfully"}

@router.patch("/{promise_id}/status")
def update_promise_status(promise_id: str, req: PromiseStatusUpdate):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM payment_promises WHERE id = ?", (promise_id,))
    p = cursor.fetchone()
    if not p:
        conn.close()
        raise HTTPException(status_code=404, detail="Payment promise not found")

    fulfilled_at = now if req.status == "fulfilled" else None
    promised_date = req.rescheduled_date if req.rescheduled_date else p["promised_date"]
    notes = (p["commitment_notes"] or "") + (f"\nUpdated: {req.notes}" if req.notes else "")

    cursor.execute("""
    UPDATE payment_promises SET
        status = ?,
        promised_date = ?,
        commitment_notes = ?,
        fulfilled_at = ?,
        updated_at = ?
    WHERE id = ?
    """, (req.status, promised_date, notes, fulfilled_at, now, promise_id))

    conn.commit()
    conn.close()

    return {"success": True, "message": f"Promise status updated to '{req.status}'"}
