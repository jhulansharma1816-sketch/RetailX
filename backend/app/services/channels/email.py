import json
import uuid
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

def send_email_message(
    business_id: str,
    customer_id: str,
    invoice_id: Optional[str],
    recipient_email: str,
    subject: str,
    body_html: str
) -> Dict[str, Any]:
    """
    Sends an email payment reminder via SMTP or logs into transparent DEMO MODE.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    is_live = bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)
    
    conn = get_db_connection()
    cursor = conn.cursor()

    log_id = str(uuid.uuid4())
    provider_msg_id = f"email_{uuid.uuid4().hex[:12]}"

    if is_live:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = recipient_email

            part = MIMEText(body_html, "html")
            msg.attach(part)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, recipient_email, msg.as_string())
            
            status = "delivered"
            resp_json = {"status": "dispatched", "smtp_host": settings.SMTP_HOST}
        except Exception as e:
            status = "failed"
            resp_json = {"error": str(e)}
    else:
        status = "delivered"
        resp_json = {
            "mode": "DEMO_SIMULATION",
            "info": "SMTP credentials not configured. Email logged in DEMO MODE.",
            "from": settings.SMTP_FROM_EMAIL,
            "to": recipient_email
        }

    cursor.execute("""
    INSERT INTO communication_logs (
        id, business_id, customer_id, invoice_id, channel, recipient,
        subject_or_title, message_body, status, provider_message_id,
        provider_response, is_demo, created_at
    ) VALUES (?, ?, ?, ?, 'email', ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        log_id, business_id, customer_id, invoice_id, recipient_email,
        subject, body_html, status, provider_msg_id, json.dumps(resp_json),
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
        "message": "Email sent successfully" if is_live else "Email recorded in DEMO MODE (SMTP server not configured)"
    }
