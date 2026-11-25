from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.app.services.recovery_scoring import calculate_recovery_worklist
from backend.app.services.channels.whatsapp import send_whatsapp_message
from backend.app.services.channels.email import send_email_message
from backend.app.services.channels.sms import send_sms_message
from backend.app.services.channels.voice import simulate_or_execute_voice_call

router = APIRouter(prefix="/recovery", tags=["AI Recovery Assistant"])

class RecoveryActionRequest(BaseModel):
    action_type: str  # "whatsapp", "email", "sms", "voice_call"
    customer_id: str
    invoice_id: str
    recipient: str
    message: Optional[str] = None
    subject: Optional[str] = None
    voice_intent: Optional[str] = "will_pay_soon"

@router.get("/worklist")
def get_recovery_worklist(business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"
    worklist = calculate_recovery_worklist(business_id)
    return {
        "success": True,
        "count": len(worklist),
        "worklist": worklist
    }

@router.post("/execute-action")
def execute_recovery_action(req: RecoveryActionRequest, business_id: Optional[str] = Query(None)):
    if not business_id:
        business_id = "biz-apex-001"

    if req.action_type == "whatsapp":
        result = send_whatsapp_message(
            business_id=business_id,
            customer_id=req.customer_id,
            invoice_id=req.invoice_id,
            recipient_phone=req.recipient,
            message_text=req.message or "Friendly payment reminder from Apex Industrial."
        )
    elif req.action_type == "email":
        result = send_email_message(
            business_id=business_id,
            customer_id=req.customer_id,
            invoice_id=req.invoice_id,
            recipient_email=req.recipient,
            subject=req.subject or "Payment Reminder",
            body_html=f"<p>{(req.message or '').replace(chr(10), '<br>')}</p>"
        )
    elif req.action_type == "sms":
        result = send_sms_message(
            business_id=business_id,
            customer_id=req.customer_id,
            invoice_id=req.invoice_id,
            recipient_phone=req.recipient,
            message_text=req.message or "Overdue payment reminder."
        )
    elif req.action_type == "voice_call":
        result = simulate_or_execute_voice_call(
            business_id=business_id,
            customer_id=req.customer_id,
            invoice_id=req.invoice_id,
            phone_number=req.recipient,
            customer_simulated_intent=req.voice_intent
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action type '{req.action_type}'")

    return result
