import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/tasks", tags=["Follow-up Task Management"])

class TaskCreate(BaseModel):
    customer_id: str
    invoice_id: Optional[str] = None
    title: str
    task_type: str = "call"
    priority: str = "medium"
    due_date: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[str] = None  # "pending", "in_progress", "completed", "cancelled"
    outcome_notes: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None

@router.get("")
def list_tasks(
    business_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    query = """
    SELECT 
        t.*,
        c.company_name,
        c.contact_person,
        c.phone,
        c.whatsapp_number,
        i.invoice_number,
        i.remaining_amount
    FROM recovery_tasks t
    JOIN customers c ON t.customer_id = c.id
    LEFT JOIN invoices i ON t.invoice_id = i.id
    WHERE t.business_id = ?
    """
    params = [business_id]

    if status and status != "all":
        query += " AND t.status = ?"
        params.append(status)

    if priority and priority != "all":
        query += " AND t.priority = ?"
        params.append(priority)

    query += " ORDER BY t.due_date ASC, t.created_at DESC"

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return rows

@router.post("")
def create_task(req: TaskCreate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    tid = f"tsk_{uuid.uuid4().hex[:8]}"
    cursor.execute("""
    INSERT INTO recovery_tasks (
        id, business_id, customer_id, invoice_id, title,
        task_type, priority, due_date, assigned_to, notes,
        status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (
        tid, business_id, req.customer_id, req.invoice_id, req.title,
        req.task_type, req.priority, req.due_date, req.assigned_to,
        req.notes, now, now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "id": tid, "message": "Recovery task created successfully"}

@router.patch("/{task_id}")
def update_task(task_id: str, req: TaskUpdate):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM recovery_tasks WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    new_status = req.status or task["status"]
    new_outcome = req.outcome_notes or task["outcome_notes"]
    new_due = req.due_date or task["due_date"]
    new_priority = req.priority or task["priority"]
    completed_at = now if new_status == "completed" else task["completed_at"]

    cursor.execute("""
    UPDATE recovery_tasks SET
        status = ?,
        outcome_notes = ?,
        due_date = ?,
        priority = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ?
    """, (new_status, new_outcome, new_due, new_priority, completed_at, now, task_id))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Task updated successfully"}
