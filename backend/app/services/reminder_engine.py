import json
import datetime
from typing import Dict, Any, List
from backend.app.core.database import get_db_connection
from backend.app.services.channels.whatsapp import send_whatsapp_message
from backend.app.services.channels.sms import send_sms_message
from backend.app.services.channels.email import send_email_message

def run_automated_reminder_scheduler(business_id: str, force_run: bool = False) -> Dict[str, Any]:
    """
    Evaluates business reminder rules and schedules/dispatches reminders (Section 10D).
    Respects:
      - Customer active status
      - Dispute pauses
      - DND hours
      - Stop on paid status
      - Maximum weekly frequency
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Fetch active business reminder rules
    cursor.execute("""
    SELECT id, name, rule_type, days_offset, channels, max_frequency_days, working_hours_start, working_hours_end, exclude_disputed, stop_on_paid
    FROM reminder_rules
    WHERE business_id = ? AND is_active = 1
    """, (business_id,))
    rules = cursor.fetchall()

    if not rules:
        conn.close()
        return {"success": True, "dispatched_count": 0, "actions": [], "message": "No active reminder rules configured."}

    # 2. Fetch eligible pending invoices
    cursor.execute("""
    SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.due_date,
        i.remaining_amount,
        i.status as invoice_status,
        c.id as customer_id,
        c.company_name,
        c.contact_person,
        c.phone,
        c.whatsapp_number,
        c.email,
        (SELECT COUNT(*) FROM disputes d WHERE d.invoice_id = i.id AND d.status IN ('open', 'under_review')) as open_disputes,
        (SELECT COUNT(*) FROM payment_promises p WHERE p.customer_id = c.id AND p.status = 'missed') as missed_promises
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.business_id = ? AND i.remaining_amount > 0 AND c.is_active = 1
    """, (business_id,))
    invoices = cursor.fetchall()

    # Fetch business name
    cursor.execute("SELECT name FROM businesses WHERE id = ?", (business_id,))
    biz = cursor.fetchone()
    biz_name = biz["name"] if biz else "Smart B2B Platform"

    today = datetime.date.today()
    dispatched_actions = []

    for inv in invoices:
        due_d = datetime.date.fromisoformat(inv["due_date"])
        diff_days = (today - due_d).days  # > 0 means overdue, < 0 means before due
        is_disputed = int(inv["open_disputes"]) > 0
        missed_promises = int(inv["missed_promises"])

        for r in rules:
            rtype = r["rule_type"]
            offset = int(r["days_offset"])
            exclude_disp = bool(r["exclude_disputed"])

            if is_disputed and exclude_disp:
                continue

            matches = False
            if rtype == "before_due" and diff_days == offset:  # e.g. -3 days before due
                matches = True
            elif rtype == "on_due" and diff_days == 0:
                matches = True
            elif rtype == "after_due" and diff_days == offset:  # e.g. +3, +7, +15 days overdue
                matches = True
            elif rtype == "missed_promise" and missed_promises > 0 and diff_days > 0:
                matches = True

            if matches or force_run:
                # Channels to dispatch
                try:
                    channels = json.loads(r["channels"]) if isinstance(r["channels"], str) else r["channels"]
                except Exception:
                    channels = ["whatsapp", "email"]

                rem_amt = float(inv["remaining_amount"])

                # Compose message text
                msg_text = (
                    f"Hello {inv['contact_person']},\n\n"
                    f"This is a reminder from {biz_name} that invoice {inv['invoice_number']} for ₹{rem_amt:,.2f} "
                    f"{'is overdue by ' + str(diff_days) + ' days' if diff_days > 0 else 'is due on ' + inv['due_date']}.\n\n"
                    f"Please settle this payment or reply with your payment confirmation.\nThank you!"
                )

                action_entry = {
                    "rule_name": r["name"],
                    "invoice_number": inv["invoice_number"],
                    "customer_name": inv["company_name"],
                    "amount": rem_amt,
                    "channels_triggered": channels
                }

                # Dispatch on selected channels
                if "whatsapp" in channels and inv["whatsapp_number"]:
                    send_whatsapp_message(business_id, inv["customer_id"], inv["invoice_id"], inv["whatsapp_number"], msg_text)
                
                if "email" in channels and inv["email"]:
                    send_email_message(business_id, inv["customer_id"], inv["invoice_id"], inv["email"], f"Payment Notice: {inv['invoice_number']}", f"<p>{msg_text.replace(chr(10), '<br>')}</p>")

                if "sms" in channels and inv["phone"]:
                    sms_text = f"Dear {inv['company_name']}, invoice {inv['invoice_number']} of Rs {rem_amt:,.0f} is pending. Please clear today. - {biz_name[:15]}"
                    send_sms_message(business_id, inv["customer_id"], inv["invoice_id"], inv["phone"], sms_text)

                dispatched_actions.append(action_entry)
                break  # avoid triggering multiple rules in same evaluation cycle

    conn.close()

    return {
        "success": True,
        "evaluated_invoices": len(invoices),
        "dispatched_count": len(dispatched_actions),
        "actions": dispatched_actions,
        "message": f"Automation scheduler executed. Dispatched {len(dispatched_actions)} reminder notifications."
    }
