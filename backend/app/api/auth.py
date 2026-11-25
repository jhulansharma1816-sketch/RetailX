import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/auth", tags=["Authentication & Onboarding"])

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    business_name: str
    business_type: Optional[str] = "Wholesale / Distribution"
    phone: Optional[str] = "+91 98201 12345"
    gstin: Optional[str] = None
    address: Optional[str] = "Industrial Area"
    city: Optional[str] = "Mumbai"
    state: Optional[str] = "Maharashtra"

@router.post("/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # In production, this verifies with Supabase Auth or hashed password.
    # We retrieve the matching profile or provide seamless fallback to default admin.
    cursor.execute("""
    SELECT p.id, p.email, p.full_name, p.role, bm.business_id, b.name as business_name
    FROM profiles p
    LEFT JOIN business_members bm ON p.id = bm.user_id
    LEFT JOIN businesses b ON bm.business_id = b.id
    WHERE LOWER(p.email) = LOWER(?)
    """, (req.email,))
    user = cursor.fetchone()

    if not user:
        # If logging in with demo account or first time
        cursor.execute("""
        SELECT p.id, p.email, p.full_name, p.role, bm.business_id, b.name as business_name
        FROM profiles p
        LEFT JOIN business_members bm ON p.id = bm.user_id
        LEFT JOIN businesses b ON bm.business_id = b.id
        LIMIT 1
        """)
        user = cursor.fetchone()

    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "success": True,
        "token": f"jwt-token-{user['id']}-{uuid.uuid4().hex[:8]}",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "business_id": user["business_id"],
            "business_name": user["business_name"]
        }
    }

@router.post("/signup")
def signup(req: SignupRequest):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if email exists
    cursor.execute("SELECT id FROM profiles WHERE LOWER(email) = LOWER(?)", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    u_id = f"usr_{uuid.uuid4().hex[:8]}"
    b_id = f"biz_{uuid.uuid4().hex[:8]}"

    # 1. Create Business
    cursor.execute("""
    INSERT INTO businesses (id, name, business_type, gstin, phone, email, address, city, state, country, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'India', 'INR', ?, ?)
    """, (
        b_id, req.business_name, req.business_type, req.gstin, req.phone, req.email,
        req.address, req.city, req.state, now, now
    ))

    # 2. Create Profile
    cursor.execute("""
    INSERT INTO profiles (id, email, full_name, role, phone, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', ?, ?, ?)
    """, (u_id, req.email, req.full_name, req.phone, now, now))

    # 3. Create Business Member
    cursor.execute("""
    INSERT INTO business_members (id, business_id, user_id, role, status, joined_at)
    VALUES (?, ?, ?, 'owner', 'active', ?)
    """, (str(uuid.uuid4()), b_id, u_id, now))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "token": f"jwt-token-{u_id}-{uuid.uuid4().hex[:8]}",
        "user": {
            "id": u_id,
            "email": req.email,
            "full_name": req.full_name,
            "role": "owner",
            "business_id": b_id,
            "business_name": req.business_name
        }
    }

@router.get("/me")
def get_current_user(business_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT p.id, p.email, p.full_name, p.role, p.phone, bm.business_id, b.name as business_name, b.business_type, b.gstin
    FROM profiles p
    JOIN business_members bm ON p.id = bm.user_id
    JOIN businesses b ON bm.business_id = b.id
    """
    if business_id:
        query += " WHERE b.id = ?"
        cursor.execute(query, (business_id,))
    else:
        cursor.execute(query + " LIMIT 1")

    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user["phone"],
        "business_id": user["business_id"],
        "business_name": user["business_name"],
        "business_type": user["business_type"],
        "gstin": user["gstin"]
    }
