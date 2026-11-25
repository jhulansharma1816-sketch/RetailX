import uuid
import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection
from backend.app.services.ai_assistant import answer_recovery_query

router = APIRouter(prefix="/chatbot", tags=["AI Recovery Chatbot"])

class ChatQueryRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

@router.post("/query")
def post_chatbot_message(req: ChatQueryRequest, business_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if not business_id:
        business_id = "biz-apex-001"

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Manage Conversation Session
    conv_id = req.conversation_id
    if not conv_id:
        conv_id = f"conv_{uuid.uuid4().hex[:8]}"
        cursor.execute("SELECT id FROM profiles LIMIT 1")
        u = cursor.fetchone()
        user_id = u["id"] if u else "usr-rajesh-001"

        cursor.execute("""
        INSERT INTO chatbot_conversations (id, business_id, user_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (conv_id, business_id, user_id, req.message[:30] + "...", now, now))

    # 2. Save User Message
    cursor.execute("""
    INSERT INTO chatbot_messages (id, conversation_id, sender_role, content, created_at)
    VALUES (?, ?, 'user', ?, ?)
    """, (str(uuid.uuid4()), conv_id, req.message, now))

    conn.commit()
    conn.close()

    # 3. Process Grounded Query
    ai_result = answer_recovery_query(business_id=business_id, prompt=req.message)

    # 4. Save Assistant Response
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO chatbot_messages (id, conversation_id, sender_role, content, created_at)
    VALUES (?, ?, 'assistant', ?, ?)
    """, (str(uuid.uuid4()), conv_id, ai_result["response"], now))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "conversation_id": conv_id,
        "reply": ai_result["response"],
        "grounded_figures": ai_result.get("grounded_figures", {})
    }

@router.get("/conversations")
def get_conversation_history(conversation_id: Optional[str] = Query(None), business_id: Optional[str] = Query(None)):
    conn = get_db_connection()
    cursor = conn.cursor()

    if not business_id:
        business_id = "biz-apex-001"

    if conversation_id:
        cursor.execute("""
        SELECT id, sender_role, content, created_at
        FROM chatbot_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        """, (conversation_id,))
        messages = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"conversation_id": conversation_id, "messages": messages}
    else:
        cursor.execute("""
        SELECT id, title, created_at, updated_at
        FROM chatbot_conversations
        WHERE business_id = ?
        ORDER BY updated_at DESC LIMIT 10
        """, (business_id,))
        convs = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"conversations": convs}
