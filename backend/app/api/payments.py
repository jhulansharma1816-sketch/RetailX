import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/payments", tags=["Payment Management"])

class PaymentCreate(BaseModel):
    customer_id: str
    invoice_id: str
    amount: float
    payment_date: str
    payment_method: str = "bank_transfer"
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

@router.get("")
def list_payments(
    business_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    invoice_id: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        p.*,
        c.company_name,
        c.contact_person,
        i.invoice_number,
        i.total_amount as invoice_total,
        i.remaining_amount as invoice_remaining
    FROM payments p
    JOIN customers c ON p.customer_id = c.id
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.business_id = ?
    """
    params = [business_id]

    if customer_id:
        query += " AND p.customer_id = ?"
        params.append(customer_id)

    if invoice_id:
        query += " AND p.invoice_id = ?"
        params.append(invoice_id)

    query += " ORDER BY p.payment_date DESC, p.created_at DESC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.post("")
def record_payment(req: PaymentCreate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    # Validation 1: Amount must be strictly > 0
    if req.amount <= 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    # Validation 2: Fetch invoice
    cursor.execute("SELECT * FROM invoices WHERE id = ?", (req.invoice_id,))
    inv = cursor.fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Selected invoice does not exist.")

    rem_before = float(inv["remaining_amount"])
    paid_before = float(inv["paid_amount"])

    # Validation 3: Prevent accidental overpayments (Section 7)
    if req.amount > rem_before:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (₹{req.amount:,.2f}) exceeds remaining balance of ₹{rem_before:,.2f}. Overpayment is prevented."
        )

    # Validation 4: Duplicate transaction reference check
    if req.transaction_reference and req.transaction_reference.strip():
        cursor.execute("""
        SELECT id FROM payments 
        WHERE business_id = ? AND UPPER(transaction_reference) = UPPER(?)
        """, (business_id, req.transaction_reference.strip()))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail=f"Transaction reference '{req.transaction_reference}' has already been recorded.")

    new_paid = paid_before + req.amount
    new_rem = rem_before - req.amount
    new_status = "paid" if new_rem == 0 else "partially_paid"

    # 1. Update Invoice balances and status
    cursor.execute("""
    UPDATE invoices SET
        paid_amount = ?,
        remaining_amount = ?,
        status = ?,
        updated_at = ?
    WHERE id = ?
    """, (new_paid, new_rem, new_status, now, req.invoice_id))

    # 2. Insert Payment Record
    p_id = f"pay_{uuid.uuid4().hex[:8]}"
    p_num = f"PAY-{uuid.uuid4().hex[:6].upper()}"

    cursor.execute("""
    INSERT INTO payments (
        id, business_id, customer_id, invoice_id, payment_number,
        amount, payment_date, payment_method, transaction_reference,
        notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        p_id, business_id, req.customer_id, req.invoice_id, p_num,
        req.amount, req.payment_date, req.payment_method,
        req.transaction_reference, req.notes, now
    ))

    # 3. Automatically check and fulfill matching pending payment promise
    cursor.execute("""
    SELECT id, promised_amount FROM payment_promises 
    WHERE invoice_id = ? AND status = 'pending'
    ORDER BY promised_date ASC LIMIT 1
    """, (req.invoice_id,))
    matched_promise = cursor.fetchone()
    if matched_promise:
        cursor.execute("""
        UPDATE payment_promises SET
            status = 'fulfilled',
            fulfilled_at = ?,
            updated_at = ?
        WHERE id = ?
        """, (now, now, matched_promise["id"]))

    # 4. Audit Log
    cursor.execute("""
    INSERT INTO activity_logs (id, business_id, action, entity_type, entity_id, description, ip_address, created_at)
    VALUES (?, ?, 'Payment recorded', 'payment', ?, ?, '127.0.0.1', ?)
    """, (
        str(uuid.uuid4()), business_id, p_id,
        f"Recorded payment of ₹{req.amount:,.2f} on {inv['invoice_number']}. Remaining: ₹{new_rem:,.2f}",
        now
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "payment_id": p_id,
        "payment_number": p_num,
        "invoice_status": new_status,
        "remaining_balance": new_rem,
        "message": f"Payment of ₹{req.amount:,.2f} recorded successfully. New balance: ₹{new_rem:,.2f}"
    }
