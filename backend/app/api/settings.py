import json
import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/settings", tags=["Settings & Integrations"])

class BusinessUpdate(BaseModel):
    name: str
    business_type: str
    gstin: Optional[str] = None
    phone: str
    email: str
    address: str
    city: str
    state: str

class IntegrationUpdate(BaseModel):
    provider: str  # "whatsapp", "sms", "email", "voice", "llm"
    is_active: bool
    is_demo_mode: bool
    config: Dict[str, Any]

class RuleUpdate(BaseModel):
    name: str
    rule_type: str
    days_offset: int
    channels: List[str]
    is_active: bool
    max_frequency_days: Optional[int] = 3

@router.get("")
def get_all_settings(business_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    # 1. Business Info
    cursor.execute("SELECT * FROM businesses WHERE id = ?", (business_id,))
    biz = cursor.fetchone()

    # 2. Integrations
    cursor.execute("SELECT * FROM integrations WHERE business_id = ?", (business_id,))
    integrations = []
    for r in cursor.fetchall():
        item = dict(r)
        try:
            item["config"] = json.loads(item["config"]) if isinstance(item["config"], str) else item["config"]
        except Exception:
            item["config"] = {}
        integrations.append(item)

    # 3. Reminder Rules
    cursor.execute("SELECT * FROM reminder_rules WHERE business_id = ?", (business_id,))
    rules = []
    for r in cursor.fetchall():
        item = dict(r)
        try:
            item["channels"] = json.loads(item["channels"]) if isinstance(item["channels"], str) else item["channels"]
        except Exception:
            item["channels"] = ["whatsapp", "email"]
        rules.append(item)

    # 4. Message Templates
    cursor.execute("SELECT * FROM message_templates WHERE business_id = ?", (business_id,))
    templates = [dict(r) for r in cursor.fetchall()]

    # 5. Team Members
    cursor.execute("""
    SELECT bm.id, bm.role, bm.status, bm.joined_at, p.full_name, p.email, p.phone
    FROM business_members bm
    JOIN profiles p ON bm.user_id = p.id
    WHERE bm.business_id = ?
    """, (business_id,))
    team = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "business": dict(biz) if biz else {},
        "integrations": integrations,
        "reminder_rules": rules,
        "message_templates": templates,
        "team_members": team
    }

@router.put("/business")
def update_business(req: BusinessUpdate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    cursor.execute("""
    UPDATE businesses SET
        name = ?,
        business_type = ?,
        gstin = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        state = ?,
        updated_at = ?
    WHERE id = ?
    """, (req.name, req.business_type, req.gstin, req.phone, req.email, req.address, req.city, req.state, now, business_id))

    conn.commit()
    conn.close()

    return {"success": True, "message": "Business profile updated successfully"}

@router.put("/integration")
def update_integration(req: IntegrationUpdate, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        cursor.execute("SELECT id FROM businesses LIMIT 1")
        b = cursor.fetchone()
        business_id = b["id"] if b else "biz-apex-001"

    status = "connected" if req.is_active else "not_connected"
    cursor.execute("""
    INSERT INTO integrations (id, business_id, provider, is_active, is_demo_mode, status, config, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(business_id, provider) DO UPDATE SET
        is_active = excluded.is_active,
        is_demo_mode = excluded.is_demo_mode,
        status = excluded.status,
        config = excluded.config,
        updated_at = excluded.updated_at
    """, (
        str(uuid.uuid4()), business_id, req.provider, 1 if req.is_active else 0,
        1 if req.is_demo_mode else 0, status, json.dumps(req.config), now
    ))

    conn.commit()
    conn.close()

    return {"success": True, "message": f"{req.provider.upper()} integration settings updated"}
