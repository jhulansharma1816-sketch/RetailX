import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection
from backend.app.services.channels.whatsapp import send_whatsapp_message
from backend.app.services.channels.sms import send_sms_message
from backend.app.services.channels.email import send_email_message
from backend.app.services.channels.voice import simulate_or_execute_voice_call
from backend.app.services.reminder_engine import run_automated_reminder_scheduler

router = APIRouter(prefix="/communications", tags=["Communication Centre"])

class SendMessageRequest(BaseModel):
    customer_id: str
    invoice_id: Optional[str] = None
    recipient: str
    message: str
    subject: Optional[str] = None

class VoiceCallRequest(BaseModel):
    customer_id: str
    invoice_id: Optional[str] = None
    phone_number: str
    simulated_intent: Optional[str] = "will_pay_soon"
    custom_script: Optional[str] = None

@router.get("")
def list_communications(
    business_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        cl.*,
        c.company_name,
        c.contact_person,
        i.invoice_number,
        i.remaining_amount
    FROM communication_logs cl
    JOIN customers c ON cl.customer_id = c.id
    LEFT JOIN invoices i ON cl.invoice_id = i.id
    WHERE cl.business_id = ?
    """
    params = [business_id]

    if channel and channel != "all":
        query += " AND cl.channel = ?"
        params.append(channel)

    if status and status != "all":
        query += " AND cl.status = ?"
        params.append(status)

    if customer_id:
        query += " AND cl.customer_id = ?"
        params.append(customer_id)

    query += " ORDER BY cl.created_at DESC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.post("/whatsapp")
def send_whatsapp(req: SendMessageRequest, business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"
    return send_whatsapp_message(
        business_id=business_id,
        customer_id=req.customer_id,
        invoice_id=req.invoice_id,
        recipient_phone=req.recipient,
        message_text=req.message
    )

@router.post("/sms")
def send_sms(req: SendMessageRequest, business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"
    return send_sms_message(
        business_id=business_id,
        customer_id=req.customer_id,
        invoice_id=req.invoice_id,
        recipient_phone=req.recipient,
        message_text=req.message
    )

@router.post("/email")
def send_email(req: SendMessageRequest, business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"
    return send_email_message(
        business_id=business_id,
        customer_id=req.customer_id,
        invoice_id=req.invoice_id,
        recipient_email=req.recipient,
        subject=req.subject or "Payment Reminder",
        body_html=f"<p>{req.message.replace(chr(10), '<br>')}</p>"
    )

@router.post("/voice-call")
def make_voice_call(req: VoiceCallRequest, business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"
    return simulate_or_execute_voice_call(
        business_id=business_id,
        customer_id=req.customer_id,
        invoice_id=req.invoice_id,
        phone_number=req.phone_number,
        customer_simulated_intent=req.simulated_intent,
        custom_script=req.custom_script
    )

@router.post("/run-scheduler")
def trigger_scheduler(business_id: Optional[str] = Query(None), force_run: bool = False):
    if not business_id:
        business_id = "biz-apex-001"
    return run_automated_reminder_scheduler(business_id=business_id, force_run=force_run)
