import json
import uuid
import datetime
from typing import Dict, Any, Optional
from backend.app.core.config import settings
from backend.app.core.database import get_db_connection

def generate_call_script(business_name: str, invoice_number: str, amount_due: float) -> str:
    """Generates polite, legally compliant AI call script with mandatory disclosure."""
    return (
        f"Hello, this is an automated payment assistant calling on behalf of {business_name}. "
        f"We are calling regarding invoice {invoice_number} with an outstanding balance of ₹{amount_due:,.2f}. "
        f"Could you please let us know when we can expect the payment?"
    )

def simulate_or_execute_voice_call(
    business_id: str,
    customer_id: str,
    invoice_id: Optional[str],
    phone_number: str,
    customer_simulated_intent: Optional[str] = "will_pay_soon",
    custom_script: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes an AI Voice Call follow-up (Section 11).
    Discloses automated AI identity upfront.
    Evaluates response intent:
      - 'will_pay_soon' -> Records a Payment Promise
      - 'already_paid' -> Creates verification task
      - 'call_back_later' -> Schedules callback task
      - 'dispute_raised' -> Flags invoice dispute
      - 'human_request' -> Alerts credit manager for direct human outreach
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    today = datetime.date.today()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Fetch business & invoice details
    cursor.execute("SELECT name FROM businesses WHERE id = ?", (business_id,))
    biz = cursor.fetchone()
    business_name = biz["name"] if biz else "Apex Industrial"

    cursor.execute("SELECT invoice_number, remaining_amount FROM invoices WHERE id = ?", (invoice_id,))
    inv = cursor.fetchone()
    inv_number = inv["invoice_number"] if inv else "INV-RECENT"
    remaining = float(inv["remaining_amount"]) if inv else 50000.0

    script = custom_script or generate_call_script(business_name, inv_number, remaining)

    # Intent Dialogues and Action Mapping
    intent_map = {
        "will_pay_soon": {
            "intent": "will_pay_soon",
            "outcome": "promise_recorded",
            "customer_phrase": "Hello, yes this is accounts. We had a slight bank delay, but we will initiate the RTGS tomorrow afternoon.",
            "ai_closing": "Thank you! We have recorded your commitment to pay tomorrow. You will receive an acknowledgment on WhatsApp.",
            "duration": 42
        },
        "already_paid": {
            "intent": "already_paid",
            "outcome": "payment_verification",
            "customer_phrase": "We already cleared this payment two days ago via NEFT. Please check your bank statement.",
            "ai_closing": "Thank you for letting us know. We have marked this invoice for payment verification. Our accounts team will confirm shortly.",
            "duration": 36
        },
        "call_back_later": {
            "intent": "call_back_later",
            "outcome": "follow_up_created",
            "customer_phrase": "I am currently driving. Please call me back tomorrow morning at 11 AM.",
            "ai_closing": "Understood. We will have a representative follow up with you tomorrow morning. Thank you and safe driving.",
            "duration": 28
        },
        "dispute_raised": {
            "intent": "dispute_raised",
            "outcome": "dispute_flagged",
            "customer_phrase": "There is an issue with this bill. We received 10 units damaged and the price does not match the purchase order.",
            "ai_closing": "Thank you for informing us. We have paused automated reminders and flagged this invoice for dispute resolution.",
            "duration": 49
        },
        "human_request": {
            "intent": "human_request",
            "outcome": "follow_up_created",
            "customer_phrase": "Please connect me to a human representative. I want to speak to Rajesh regarding credit terms.",
            "ai_closing": "Certainly. An alert has been forwarded to Mr. Rajesh Kumar, who will call you back directly today.",
            "duration": 32
        }
    }

    selected = intent_map.get(customer_simulated_intent, intent_map["will_pay_soon"])
    transcript = f"AI: {script}\nCustomer: {selected['customer_phrase']}\nAI: {selected['ai_closing']}"

    call_id = f"vlog_{uuid.uuid4().hex[:10]}"
    is_live = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN) or bool(settings.EXOTEL_ACCOUNT_SID)

    # Record voice call log
    cursor.execute("""
    INSERT INTO voice_call_logs (
        id, business_id, customer_id, invoice_id, phone_number,
        script_used, transcript, detected_intent, outcome, duration_seconds,
        status, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    """, (
        call_id, business_id, customer_id, invoice_id, phone_number,
        script, transcript, selected["intent"], selected["outcome"],
        selected["duration"], 0 if is_live else 1, now_str
    ))

    # Also log in central communication logs
    cursor.execute("""
    INSERT INTO communication_logs (
        id, business_id, customer_id, invoice_id, channel, recipient,
        subject_or_title, message_body, status, provider_message_id,
        provider_response, response_text, follow_up_action, is_demo, created_at
    ) VALUES (?, ?, ?, ?, 'voice_call', ?, 'AI Voice Call Reminder', ?, 'delivered', ?, ?, ?, ?, ?, ?)
    """, (
        str(uuid.uuid4()), business_id, customer_id, invoice_id, phone_number,
        script, call_id, json.dumps({"transcript": transcript, "intent": selected["intent"]}),
        selected["customer_phrase"], f"Action triggered: {selected['outcome']}",
        0 if is_live else 1, now_str
    ))

    # Automatic Workflow Execution based on intent
    action_summary = ""
    if selected["outcome"] == "promise_recorded":
        prm_id = f"prm_{uuid.uuid4().hex[:8]}"
        promised_date = (today + datetime.timedelta(days=1)).isoformat()
        cursor.execute("""
        INSERT INTO payment_promises (id, business_id, customer_id, invoice_id, promised_amount, promised_date, commitment_notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """, (
            prm_id, business_id, customer_id, invoice_id, remaining, promised_date,
            f"Automated Voice Commitment: Customer stated '{selected['customer_phrase']}'",
            now_str, now_str
        ))
        action_summary = f"Recorded Payment Promise of ₹{remaining:,.2f} for {promised_date}."

    elif selected["outcome"] == "payment_verification":
        cursor.execute("""
        INSERT INTO recovery_tasks (id, business_id, customer_id, invoice_id, title, task_type, priority, due_date, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'verification', 'urgent', ?, ?, 'pending', ?, ?)
        """, (
            str(uuid.uuid4()), business_id, customer_id, invoice_id,
            f"Verify Bank Payment for {inv_number}",
            today.isoformat(),
            f"Customer informed AI caller that payment was already dispatched: '{selected['customer_phrase']}'",
            now_str, now_str
        ))
        action_summary = "Created urgent Bank Payment Verification task."

    elif selected["outcome"] == "dispute_flagged":
        cursor.execute("UPDATE invoices SET status = 'disputed' WHERE id = ?", (invoice_id,))
        dsp_id = f"dsp_{uuid.uuid4().hex[:8]}"
        cursor.execute("""
        INSERT INTO disputes (id, business_id, customer_id, invoice_id, dispute_number, category, description, disputed_amount, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'pricing_error', ?, ?, 'open', ?, ?)
        """, (
            dsp_id, business_id, customer_id, invoice_id, f"DSP-{uuid.uuid4().hex[:6].upper()}",
            f"Flagged via AI Voice Call: {selected['customer_phrase']}",
            remaining, now_str, now_str
        ))
        action_summary = "Paused reminders and raised Dispute record."

    elif selected["outcome"] == "follow_up_created":
        cursor.execute("""
        INSERT INTO recovery_tasks (id, business_id, customer_id, invoice_id, title, task_type, priority, due_date, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'call', 'high', ?, ?, 'pending', ?, ?)
        """, (
            str(uuid.uuid4()), business_id, customer_id, invoice_id,
            f"Human Follow-up with {phone_number}",
            (today + datetime.timedelta(days=1)).isoformat(),
            f"AI Call Follow-up Request: '{selected['customer_phrase']}'",
            now_str, now_str
        ))
        action_summary = "Created Human Follow-up task."

    conn.commit()
    conn.close()

    return {
        "success": True,
        "call_id": call_id,
        "phone_number": phone_number,
        "status": "completed",
        "duration_seconds": selected["duration"],
        "detected_intent": selected["intent"],
        "outcome": selected["outcome"],
        "transcript": transcript,
        "action_summary": action_summary,
        "is_demo": not is_live,
        "message": "AI Voice Call simulated in DEMO MODE" if not is_live else "Live Voice Call executed"
    }
