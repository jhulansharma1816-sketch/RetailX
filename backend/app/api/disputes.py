import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/disputes", tags=["Dispute Management"])

class DisputeCreate(BaseModel):
    customer_id: str
    invoice_id: str
    category: str  # pricing_error, damaged_goods, short_shipment, tax_mismatch, already_paid, other
    description: str
    disputed_amount: float
    assigned_to: Optional[str] = None

class DisputeUpdate(BaseModel):
    status: str  # "open", "under_review", "awaiting_customer", "resolved", "rejected"
    resolution_notes: Optional[str] = None

@router.get("")
def list_disputes(business_id: Optional[str] = Query(None), status: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        d.*,
        c.company_name,
        c.contact_person,
        c.phone,
        i.invoice_number,
        i.total_amount as invoice_total,
        i.remaining_amount as invoice_remaining
    FROM disputes d
    JOIN customers c ON d.customer_id = c.id
    JOIN invoices i ON d.invoice_id = i.id
    WHERE d.business_id = ?
    """
    params = [business_id]

    if status and status != "all":
        query += " AND d.status = ?"
        params.append(status)

    query += " ORDER BY d.created_at DESC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.post("")
def raise_dispute(req: DisputeCreate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    # Mark invoice as disputed
    cursor.execute("UPDATE invoices SET status = 'disputed', updated_at = ? WHERE id = ?", (now, req.invoice_id))

    dsp_id = f"dsp_{uuid.uuid4().hex[:8]}"
    dsp_num = f"DSP-{uuid.uuid4().hex[:6].upper()}"

    cursor.execute("""
    INSERT INTO disputes (
        id, business_id, customer_id, invoice_id, dispute_number,
        category, description, disputed_amount, status, assigned_to,
        created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    """, (
        dsp_id, business_id, req.customer_id, req.invoice_id, dsp_num,
        req.category, req.description, req.disputed_amount, req.assigned_to,
        now, now
    ))

    # Audit log
    cursor.execute("""
    INSERT INTO activity_logs (id, business_id, action, entity_type, entity_id, description, ip_address, created_at)
    VALUES (?, ?, 'Dispute raised', 'dispute', ?, ?, '127.0.0.1', ?)
    """, (
        str(uuid.uuid4()), business_id, dsp_id,
        f"Dispute {dsp_num} raised for ₹{req.disputed_amount:,.2f} on invoice",
        now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "id": dsp_id, "dispute_number": dsp_num, "message": "Dispute raised and reminders paused for this invoice"}

@router.patch("/{dispute_id}")
def update_dispute(dispute_id: str, req: DisputeUpdate):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT invoice_id FROM disputes WHERE id = ?", (dispute_id,))
    dsp = cursor.fetchone()
    if not dsp:
        conn.close()
        raise HTTPException(status_code=404, detail="Dispute not found")

    resolved_at = now if req.status in ["resolved", "rejected"] else None

    cursor.execute("""
    UPDATE disputes SET
        status = ?,
        resolution_notes = ?,
        resolved_at = ?,
        updated_at = ?
    WHERE id = ?
    """, (req.status, req.resolution_notes, resolved_at, now, dispute_id))

    # If resolved or rejected, restore invoice status based on remaining balance
    if req.status in ["resolved", "rejected"]:
        cursor.execute("SELECT remaining_amount, paid_amount, due_date FROM invoices WHERE id = ?", (dsp["invoice_id"],))
        inv = cursor.fetchone()
        if inv:
            today = datetime.date.today()
            due_d = datetime.date.fromisoformat(inv["due_date"])
            rem = float(inv["remaining_amount"])
            paid = float(inv["paid_amount"])

            if rem == 0:
                restored_status = "paid"
            elif paid > 0:
                restored_status = "partially_paid"
            elif due_d < today:
                restored_status = "overdue"
            else:
                restored_status = "sent"

            cursor.execute("UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?", (restored_status, now, dsp["invoice_id"]))

    conn.commit()
    conn.close()

    return {"success": True, "message": f"Dispute status updated to '{req.status}'"}
