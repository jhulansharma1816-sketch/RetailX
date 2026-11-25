import datetime
from typing import List, Dict, Any
from backend.app.core.database import get_db_connection

def calculate_recovery_worklist(business_id: str) -> List[Dict[str, Any]]:
    """
    Transparent, explainable AI Recovery Assistant scoring engine (Section 8).
    Evaluates:
      - Days overdue
      - Outstanding balance
      - Missed payment promises
      - Open disputes
      - Contact history
    Returns prioritized items with explicit explanation and recommended next action.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query all active invoices with remaining balance > 0
    query = """
    SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.due_date,
        i.total_amount,
        i.paid_amount,
        i.remaining_amount,
        i.status as invoice_status,
        c.id as customer_id,
        c.company_name,
        c.contact_person,
        c.phone,
        c.whatsapp_number,
        c.email,
        (SELECT COUNT(*) FROM payment_promises p WHERE p.customer_id = c.id AND p.status = 'missed') as missed_promises_count,
        (SELECT COUNT(*) FROM payment_promises p WHERE p.customer_id = c.id AND p.status = 'pending') as pending_promises_count,
        (SELECT COUNT(*) FROM disputes d WHERE d.invoice_id = i.id AND d.status IN ('open', 'under_review', 'awaiting_customer')) as open_disputes_count,
        (SELECT COUNT(*) FROM communication_logs cl WHERE cl.invoice_id = i.id) as follow_up_count,
        (SELECT MAX(cl.created_at) FROM communication_logs cl WHERE cl.invoice_id = i.id) as last_contact_date
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.business_id = ? AND i.remaining_amount > 0 AND c.is_active = 1
    ORDER BY i.due_date ASC
    """

    cursor.execute(query, (business_id,))
    rows = cursor.fetchall()

    today = datetime.date.today()
    worklist = []

    for r in rows:
        due_date = datetime.date.fromisoformat(r["due_date"])
        days_overdue = (today - due_date).days
        remaining = float(r["remaining_amount"])
        missed_promises = int(r["missed_promises_count"])
        pending_promises = int(r["pending_promises_count"])
        open_disputes = int(r["open_disputes_count"])
        follow_ups = int(r["follow_up_count"])

        # Calculate multi-factor transparent score (0 to 100)
        score = 0
        reasons = []

        # 1. Overdue Duration Factor
        if days_overdue > 30:
            score += 40
            reasons.append(f"Invoice is {days_overdue} days overdue (exceeds 30-day grace period)")
        elif days_overdue > 15:
            score += 25
            reasons.append(f"Invoice is {days_overdue} days overdue")
        elif days_overdue > 0:
            score += 15
            reasons.append(f"Invoice is {days_overdue} days past due date")
        elif days_overdue == 0:
            score += 10
            reasons.append("Invoice is due today")
        elif days_overdue >= -3:
            score += 5
            reasons.append(f"Invoice is due in {abs(days_overdue)} days")
        else:
            reasons.append(f"Upcoming payment due in {abs(days_overdue)} days")

        # 2. Outstanding Balance Factor
        if remaining >= 100000:
            score += 25
            reasons.append(f"High outstanding exposure of ₹{remaining:,.2f}")
        elif remaining >= 50000:
            score += 15
            reasons.append(f"Substantial balance of ₹{remaining:,.2f}")
        elif remaining >= 20000:
            score += 10
            reasons.append(f"Pending balance of ₹{remaining:,.2f}")

        # 3. Missed Promises Factor
        if missed_promises > 1:
            score += 30
            reasons.append(f"Customer has missed {missed_promises} previous payment commitments")
        elif missed_promises == 1:
            score += 20
            reasons.append("Customer missed a previous payment commitment")

        # 4. Dispute Factor
        if open_disputes > 0:
            # Disputes require human intervention rather than automated aggressive chasing
            score = max(score, 60)
            reasons.append("Active dispute flagged on invoice — automated collection paused for review")

        # Cap score at 100
        score = min(score, 100)

        # Classify Priority Level
        if open_disputes > 0:
            priority = "Dispute Review"
            priority_level = "dispute"
        elif score >= 65 or days_overdue > 30 or missed_promises > 0:
            priority = "High Priority"
            priority_level = "high"
        elif score >= 35 or days_overdue > 7:
            priority = "Medium Priority"
            priority_level = "medium"
        else:
            priority = "Low Priority"
            priority_level = "low"

        # Formulate Suggested Next Action
        if open_disputes > 0:
            suggested_action = "Review Dispute with Sales / Billing Team"
            action_type = "dispute"
        elif missed_promises > 0:
            suggested_action = "Escalate with Phone Follow-up or WhatsApp Urgent Notice"
            action_type = "escalate"
        elif days_overdue > 30:
            suggested_action = "Schedule AI Voice Polite Follow-up Call"
            action_type = "voice_call"
        elif days_overdue > 7:
            suggested_action = "Send WhatsApp Payment Reminder with Payment Link"
            action_type = "whatsapp"
        elif days_overdue > 0:
            suggested_action = "Send Friendly Email & WhatsApp Reminder"
            action_type = "whatsapp_email"
        elif days_overdue >= -3:
            suggested_action = "Send Upcoming Due Date Courtesy Alert"
            action_type = "courtesy_alert"
        else:
            suggested_action = "Monitor for upcoming due date"
            action_type = "monitor"

        formatted_explanation = f"{priority}: " + ", ".join(reasons) + "."

        worklist.append({
            "invoice_id": r["invoice_id"],
            "invoice_number": r["invoice_number"],
            "due_date": r["due_date"],
            "days_overdue": days_overdue,
            "total_amount": float(r["total_amount"]),
            "paid_amount": float(r["paid_amount"]),
            "remaining_amount": remaining,
            "invoice_status": r["invoice_status"],
            "customer_id": r["customer_id"],
            "company_name": r["company_name"],
            "contact_person": r["contact_person"],
            "phone": r["phone"],
            "whatsapp_number": r["whatsapp_number"],
            "email": r["email"],
            "missed_promises": missed_promises,
            "pending_promises": pending_promises,
            "open_disputes": open_disputes,
            "follow_up_count": follow_ups,
            "last_contact_date": r["last_contact_date"],
            "score": score,
            "priority": priority,
            "priority_level": priority_level,
            "explanation": formatted_explanation,
            "suggested_action": suggested_action,
            "action_type": action_type
        })

    conn.close()

    # Sort worklist: disputes and high priorities first, then descending score
    priority_order = {"dispute": 0, "high": 1, "medium": 2, "low": 3}
    worklist.sort(key=lambda item: (priority_order.get(item["priority_level"], 4), -item["score"], -item["days_overdue"]))

    return worklist
