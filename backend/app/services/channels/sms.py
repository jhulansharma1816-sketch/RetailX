import json
import uuid
import datetime
import httpx
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

def send_sms_message(
    business_id: str,
    customer_id: str,
    invoice_id: Optional[str],
    recipient_phone: str,
    message_text: str,
    dlt_template_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends an SMS reminder via Indian SMS Gateway with DLT template alignment.
    Falls back gracefully to transparent DEMO MODE if credentials are not configured.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    is_live = bool(settings.SMS_GATEWAY_URL and settings.SMS_API_KEY)
    
    conn = get_db_connection()
    cursor = conn.cursor()

    log_id = str(uuid.uuid4())
    provider_msg_id = f"sms_{uuid.uuid4().hex[:10]}"

    if is_live:
        try:
            headers = {"authorization": settings.SMS_API_KEY, "Content-Type": "application/json"}
            payload = {
                "sender_id": settings.SMS_SENDER_ID,
                "message": message_text,
                "numbers": recipient_phone.replace("+91", "").replace(" ", ""),
                "dlt_template_id": dlt_template_id or settings.SMS_DLT_ENTITY_ID
            }
            with httpx.Client(timeout=10.0) as client:
                res = client.post(settings.SMS_GATEWAY_URL, headers=headers, json=payload)
                if res.status_code in [200, 201]:
                    status = "delivered"
                    resp_json = res.json()
                else:
                    status = "failed"
                    resp_json = {"code": res.status_code, "text": res.text}
        except Exception as e:
            status = "failed"
            resp_json = {"error": str(e)}
    else:
        status = "delivered"
        resp_json = {
            "mode": "DEMO_SIMULATION",
            "info": "SMS Gateway / DLT credentials not set. Demo SMS recorded.",
            "sender_id": settings.SMS_SENDER_ID,
            "dlt_template_id": dlt_template_id or "DLT-110716182901"
        }

    cursor.execute("""
    INSERT INTO communication_logs (
        id, business_id, customer_id, invoice_id, channel, recipient,
        subject_or_title, message_body, status, provider_message_id,
        provider_response, is_demo, created_at
    ) VALUES (?, ?, ?, ?, 'sms', ?, 'DLT SMS Overdue Notice', ?, ?, ?, ?, ?, ?)
    """, (
        log_id, business_id, customer_id, invoice_id, recipient_phone,
        message_text, status, provider_msg_id, json.dumps(resp_json),
        0 if is_live else 1, now
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "log_id": log_id,
        "status": status,
        "provider_message_id": provider_msg_id,
        "is_demo": not is_live,
        "message": "SMS sent successfully" if is_live else "SMS simulated in DEMO MODE (SMS Gateway API key not configured)"
    }
