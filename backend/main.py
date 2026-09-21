import os
import sys

# Ensure backend directory is in sys.path for relative imports in all environments (local & Vercel)
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import json
import sqlite3
import random
import datetime
import base64
import urllib.parse
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import aiohttp
import logging
from dotenv import load_dotenv

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("mindmitra")

# Import modular analytics, adaptive, explanation, quality, auth and demo services
from services.config import (
    MIN_TREND_SESSIONS,
    DOMAIN_MAPPING,
    DOMAIN_LABELS,
    DOMAIN_ICONS,
    MEDICAL_DISCLAIMER,
)
from services.data_quality_service import filter_eligible_sessions, validate_session_quality
from services.baseline_service import calculate_personal_baseline
from services.trend_service import analyze_domain_trend, calculate_overall_behavioral_trend
from services.adaptive_service import recommend_next_difficulty
from services.explanation_service import generate_caregiver_insight
from services.demo_service import seed_demo_scenarios
from services.auth_service import hash_password, verify_password, create_access_token, decode_access_token, verify_profile_ownership

load_dotenv()

from services.db_adapter import get_db, get_engine_name, HAS_POSTGRES, DATABASE_URL, DB_FILE, sync_postgres_sequences

app = FastAPI(title="MindMitra Backend - Caregiver & Multi-Profile Cognitive Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/debug/ping")
def debug_ping():
    return {"ping": "pong", "status": "ok"}

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        is_postgres = getattr(conn, 'is_postgres', False)

        def column_exists(cursor, table, column):
            if is_postgres:
                cursor.execute("""
                    SELECT 1 FROM information_schema.columns 
                    WHERE LOWER(table_name) = LOWER(%s) AND LOWER(column_name) = LOWER(%s)
                """, (table, column))
                return bool(cursor.fetchone())
            else:
                cursor.execute(f"PRAGMA table_info({table})")
                rows = cursor.fetchall()
                cols = []
                for r in rows:
                    if isinstance(r, dict):
                        cols.append(r.get("name"))
                    elif isinstance(r, (list, tuple)):
                        cols.append(r[1])
                    else:
                        cols.append(getattr(r, 'name', None) or r[1])
                return column in cols

        # 1. Caregivers table
        c.execute("""
            CREATE TABLE IF NOT EXISTS caregivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                active BOOLEAN DEFAULT 1
            )
        """)

        # 2. Elderly Profiles table
        c.execute("""
            CREATE TABLE IF NOT EXISTS elderly_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caregiver_id INTEGER,
                name TEXT,
                age INTEGER,
                preferred_language TEXT,
                voice_enabled BOOLEAN,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                active BOOLEAN DEFAULT 1
            )
        """)

        # 3. Users table (synced view/table for backwards-compat)
        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                display_name TEXT,
                age INTEGER,
                preferred_language TEXT,
                voice_enabled BOOLEAN,
                created_at TIMESTAMP
            )
        """)

        # 4. Sessions
        c.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                status TEXT
            )
        """)

        # 5. Game Sessions
        c.execute("""
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                user_id INTEGER,
                game_type TEXT,
                difficulty INTEGER,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                accuracy REAL,
                avg_response_time_ms REAL,
                total_events INTEGER,
                repeat_errors INTEGER,
                corrections INTEGER,
                completion_time_ms REAL,
                invalid_for_trend BOOLEAN DEFAULT 0,
                exclusion_reason TEXT
            )
        """)

        # 6. Game Events
        c.execute("""
            CREATE TABLE IF NOT EXISTS game_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_session_id INTEGER,
                user_id INTEGER,
                event_type TEXT,
                event_data_json TEXT,
                timestamp TIMESTAMP
            )
        """)

        # 7. Adaptive Decisions
        c.execute("""
            CREATE TABLE IF NOT EXISTS adaptive_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_session_id INTEGER,
                user_id INTEGER,
                game_type TEXT,
                previous_difficulty INTEGER,
                recommended_difficulty INTEGER,
                recommendation TEXT,
                reason TEXT,
                model_used TEXT,
                confidence REAL,
                features_json TEXT,
                timestamp TIMESTAMP
            )
        """)

        # 8. Familiar People
        c.execute("""
            CREATE TABLE IF NOT EXISTS familiar_people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT,
                relationship TEXT,
                photo_url TEXT,
                consent_confirmed BOOLEAN,
                created_at TIMESTAMP
            )
        """)

        # 9. Reminders
        c.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                title TEXT,
                time TEXT,
                repeat_pattern TEXT,
                enabled BOOLEAN,
                created_at TIMESTAMP
            )
        """)

        # 10. Sync Queue
        c.execute("""
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT,
                entity_id INTEGER,
                action TEXT,
                data_json TEXT,
                created_at TIMESTAMP,
                synced_at TIMESTAMP
            )
        """)

        # 11. Community Sessions
        c.execute("""
            CREATE TABLE IF NOT EXISTS community_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caregiver_id INTEGER,
                name TEXT,
                activity_type TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                status TEXT,
                duration_minutes INTEGER,
                notes TEXT
            )
        """)

        # 12. Community Participants (Many-to-Many relationship)
        c.execute("""
            CREATE TABLE IF NOT EXISTS community_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                community_session_id INTEGER,
                profile_id INTEGER,
                attended BOOLEAN DEFAULT 1,
                participation_level TEXT,
                notes TEXT
            )
        """)

        # 13. Community Events
        c.execute("""
            CREATE TABLE IF NOT EXISTS community_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                community_session_id INTEGER,
                profile_id INTEGER,
                activity_key TEXT,
                event_type TEXT,
                data_json TEXT,
                timestamp TIMESTAMP
            )
        """)

        # 14. Trusted Connections (Profile Scoped)
        c.execute("""
            CREATE TABLE IF NOT EXISTS trusted_connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER,
                contact_type TEXT DEFAULT 'mindmitra_user',
                contact_name TEXT,
                display_name TEXT,
                relationship TEXT,
                caregiver_name TEXT,
                target_user_id INTEGER,
                contact_user_id INTEGER,
                phone_number TEXT,
                phone_or_address TEXT,
                status TEXT DEFAULT 'approved',
                approval_required BOOLEAN DEFAULT 0,
                created_at TIMESTAMP
            )
        """)

        # 15. Memory Stories (Profile Scoped)
        c.execute("""
            CREATE TABLE IF NOT EXISTS memory_stories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER,
                title TEXT,
                audio_url TEXT,
                transcript_text TEXT,
                category TEXT,
                is_private BOOLEAN DEFAULT 1,
                created_at TIMESTAMP
            )
        """)

        # 16. Real-time Active Presence (Database-backed for Serverless & Multi-Device)
        c.execute("""
            CREATE TABLE IF NOT EXISTS active_presence (
                user_id INTEGER PRIMARY KEY,
                active_session_id TEXT,
                online BOOLEAN DEFAULT 1,
                last_heartbeat TIMESTAMP,
                updated_at TIMESTAMP
            )
        """)

        # 17. Real-time WebRTC Call Signals Queue (Database-backed)
        c.execute("""
            CREATE TABLE IF NOT EXISTS call_signals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                call_id TEXT,
                caller_profile_id INTEGER,
                caller_name TEXT,
                caller_relationship TEXT,
                target_user_id INTEGER,
                signal_type TEXT,
                payload TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP
            )
        """)

        # 18. Real-time Office Kit Packets Table (Cross-device physical sync)
        c.execute("""
            CREATE TABLE IF NOT EXISTS office_kit_packets (
                id TEXT PRIMARY KEY,
                profile_id INTEGER,
                packet_json TEXT NOT NULL,
                created_at TIMESTAMP
            )
        """)

        # Perform table migrations safely
        for col_def in [
            ("game_sessions", "invalid_for_trend", "BOOLEAN DEFAULT 0"),
            ("game_sessions", "exclusion_reason", "TEXT"),
            ("adaptive_decisions", "reason", "TEXT"),
            ("caregivers", "active", "BOOLEAN DEFAULT 1"),
            ("elderly_profiles", "active", "BOOLEAN DEFAULT 1"),
            ("elderly_profiles", "status", "TEXT DEFAULT 'active'"),
            ("trusted_connections", "contact_user_id", "INTEGER"),
            ("trusted_connections", "target_user_id", "INTEGER"),
            ("trusted_connections", "display_name", "TEXT"),
            ("trusted_connections", "contact_type", "TEXT DEFAULT 'mindmitra_user'"),
            ("trusted_connections", "caregiver_name", "TEXT"),
            ("trusted_connections", "phone_number", "TEXT"),
        ]:
            tbl, col, dtype = col_def
            if not column_exists(c, tbl, col):
                try:
                    c.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {dtype}")
                except Exception as alter_err:
                    logger.warning(f"Failed to add column {col} to {tbl}: {alter_err}")

        # If caregivers table is empty, seed demo caregiver
        c.execute("SELECT COUNT(*) as count FROM caregivers")
        if c.fetchone()["count"] == 0:
            now = datetime.datetime.now().isoformat()
            pwd_hash = hash_password("mindmitra123")
            c.execute("""
                INSERT INTO caregivers (id, name, email, password_hash, created_at, updated_at, active)
                VALUES (1, 'Pavan Kumar', 'pavan@mindmitra.com', ?, ?, ?, TRUE)
            """, (pwd_hash, now, now))

        sync_postgres_sequences(conn)
        conn.commit()

# Ensure database tables exist on module load
try:
    init_db()
except Exception as _e:
    pass

@app.on_event("startup")
def startup_event():
    try:
        init_db()
        logger.info(f"Database initialization complete. Engine: {get_engine_name()}")
    except Exception as e:
        logger.error(f"[Startup Fail] Database initialization failed: {e}")

# --- AUTH DEPENDENCY ---

def get_current_caregiver(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    return decode_access_token(token)

def check_caregiver_profile_access(conn, current: Optional[Dict[str, Any]], profile_id: int):
    """
    Verifies that if current user is authenticated, the requested profile_id belongs to that user/caregiver.
    Raises HTTPException(403) if access is forbidden.
    """
    if not current:
        return
    caregiver_id = current.get("caregiver_id")
    if caregiver_id and not verify_profile_ownership(conn, caregiver_id, profile_id):
        raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")

# --- MODELS ---

class CaregiverRegister(BaseModel):
    name: str
    email: str
    password: str
    preferred_language: str = "en"
    age: Optional[int] = None
    auto_create_profile: bool = False

class CaregiverLogin(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ProfileCreate(BaseModel):
    name: str
    age: int
    preferred_language: str = "en"
    voice_enabled: bool = True

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    preferred_language: Optional[str] = None
    voice_enabled: Optional[bool] = None

class DeleteProfileRequest(BaseModel):
    confirm_name: str

class UserCreate(BaseModel):
    display_name: str
    age: int
    preferred_language: str = "en"
    voice_enabled: bool = True

class SessionStart(BaseModel):
    user_id: int

class GameSessionStart(BaseModel):
    session_id: int
    user_id: int
    game_type: str
    difficulty: int = 1

class GameSessionComplete(BaseModel):
    accuracy: float
    avg_response_time_ms: float
    total_events: int
    repeat_errors: int = 0
    corrections: int = 0
    completion_time_ms: float = 0.0

class GameEventRecord(BaseModel):
    game_session_id: int
    user_id: int
    event_type: str
    event_data: dict

class AdaptiveMetrics(BaseModel):
    accuracy: float
    mean_response_time_ms: float
    response_time_variance: float = 0.0
    repeat_error_rate: float = 0.0
    correction_rate: float = 0.0
    completion_time_ms: float = 0.0
    current_difficulty: int = 1
    previous_session_accuracy: Optional[float] = None
    recent_trend: Optional[float] = None

class AdaptiveRecommendRequest(BaseModel):
    user_id: int
    game_type: str
    current_metrics: AdaptiveMetrics

class FamiliarPersonCreate(BaseModel):
    user_id: int
    name: str
    relationship: str
    photo_url: str
    consent_confirmed: bool = True

class FamiliarPersonUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    photo_url: Optional[str] = None
    consent_confirmed: Optional[bool] = None

class ReminderModel(BaseModel):
    user_id: int
    type: str
    title: str
    time: str
    repeat_pattern: str
    enabled: bool

class TTSRequest(BaseModel):
    text: str
    language: str = "te-IN"

# --- ENDPOINTS: CAREGIVER AUTHENTICATION ---

@app.post("/api/auth/register")
def register_caregiver(req: CaregiverRegister):
    email = req.email.lower().strip()
    name = req.name.strip()
    if not email or not req.password or not name:
        raise HTTPException(status_code=400, detail="Full name, email, and password are required.")

    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM caregivers WHERE LOWER(TRIM(email)) = ?", (email,))
        if c.fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        now = datetime.datetime.now().isoformat()
        pwd_hash = hash_password(req.password)
        c.execute("""
            INSERT INTO caregivers (name, email, password_hash, created_at, updated_at, active)
            VALUES (?, ?, ?, ?, ?, TRUE)
        """, (name, email, pwd_hash, now, now))
        caregiver_id = c.lastrowid

        token = create_access_token(caregiver_id, email, name)
        
        # If client explicitly requests initial profile creation upon register
        profile_data = None
        if getattr(req, "auto_create_profile", False):
            lang = getattr(req, "preferred_language", "en") or "en"
            age = getattr(req, "age", 70) or 70
            c.execute("""
                INSERT INTO elderly_profiles (caregiver_id, name, age, preferred_language, voice_enabled, created_at, updated_at, active, status)
                VALUES (?, ?, ?, ?, TRUE, ?, ?, TRUE, 'active')
            """, (caregiver_id, name, age, lang, now, now))
            profile_id = c.lastrowid

            # Sync to users table for backward compat
            c.execute("""
                INSERT INTO users (id, display_name, age, preferred_language, voice_enabled, created_at)
                VALUES (?, ?, ?, ?, TRUE, ?)
            """, (profile_id, name, age, lang, now))
            profile_data = {
                "id": profile_id,
                "name": name,
                "display_name": name,
                "age": age,
                "preferred_language": lang,
                "voice_enabled": True,
            }

        conn.commit()

        logger.info(f"[Auth] Caregiver registered successfully: id={caregiver_id}, email={email}")
        return {
            "token": token,
            "caregiver": {
                "id": caregiver_id,
                "name": name,
                "email": email,
            },
            "profile": profile_data
        }

@app.post("/api/auth/login")
def login_caregiver(req: CaregiverLogin):
    email = req.email.lower().strip()
    password = req.password
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    with get_db() as conn:
        try:
            c = conn.cursor()
            c.execute("SELECT * FROM caregivers WHERE LOWER(TRIM(email)) = ? AND (active IS TRUE OR active IS NULL)", (email,))
            caregiver = c.fetchone()
            if not caregiver or not verify_password(password, caregiver["password_hash"]):
                logger.warning(f"[Auth] Login failed for email={email}")
                raise HTTPException(status_code=401, detail="Email or password is incorrect.")

            token = create_access_token(caregiver["id"], caregiver["email"], caregiver["name"])
            logger.info(f"[Auth] Caregiver logged in: id={caregiver['id']}, email={email}")
            return {
                "token": token,
                "caregiver": {
                    "id": caregiver["id"],
                    "name": caregiver["name"],
                    "email": caregiver["email"],
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"[Auth] Login crash: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error. Please try again.")

@app.get("/api/auth/me")
def get_current_user_profile(current=Depends(get_current_caregiver)):
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")

    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT id, name, email, created_at FROM caregivers WHERE id = ?", (current["caregiver_id"],))
        cg = c.fetchone()
        if not cg:
            raise HTTPException(status_code=404, detail="Caregiver account not found")

        # Get active profiles for this caregiver
        c.execute("""
            SELECT id, name as display_name, name, age, preferred_language, voice_enabled, created_at, COALESCE(status, 'active') as status
            FROM elderly_profiles
            WHERE caregiver_id = ? AND (active IS TRUE OR active IS NULL) AND COALESCE(status, 'active') = 'active'
            ORDER BY id ASC
        """, (current["caregiver_id"],))
        profiles = [dict(row) for row in c.fetchall()]

        return {
            "caregiver": dict(cg),
            "profiles": profiles,
        }

@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, current=Depends(get_current_caregiver)):
    if not current:
        raise HTTPException(status_code=401, detail="Authentication required")

    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT password_hash FROM caregivers WHERE id = ?", (current["caregiver_id"],))
        cg = c.fetchone()
        if not cg or not verify_password(req.current_password, cg["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        new_hash = hash_password(req.new_password)
        now = datetime.datetime.now().isoformat()
        c.execute("UPDATE caregivers SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now, current["caregiver_id"]))
        conn.commit()
        return {"status": "password_updated"}

@app.post("/api/auth/logout")
def logout():
    return {"status": "logged_out"}

# --- ENDPOINTS: ELDERLY SUB-PROFILES & LIFECYCLE ---

def _get_profiles_for_caregiver(caregiver_id: int, include_archived: bool = False):
    with get_db() as conn:
        c = conn.cursor()
        if include_archived:
            c.execute("""
                SELECT id, name as display_name, name, age, preferred_language, voice_enabled, created_at, COALESCE(status, 'active') as status
                FROM elderly_profiles
                WHERE caregiver_id = ? AND (active IS TRUE OR active IS NULL)
                ORDER BY id ASC
            """, (caregiver_id,))
        else:
            c.execute("""
                SELECT id, name as display_name, name, age, preferred_language, voice_enabled, created_at, COALESCE(status, 'active') as status
                FROM elderly_profiles
                WHERE caregiver_id = ? AND (active IS TRUE OR active IS NULL) AND COALESCE(status, 'active') = 'active'
                ORDER BY id ASC
            """, (caregiver_id,))
        return [dict(row) for row in c.fetchall()]

@app.get("/api/profiles")
def list_profiles(include_archived: bool = False, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    return _get_profiles_for_caregiver(caregiver_id, include_archived)

@app.get("/api/profiles/archived")
def list_archived_profiles(current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT id, name as display_name, name, age, preferred_language, voice_enabled, created_at, 'archived' as status
            FROM elderly_profiles
            WHERE caregiver_id = ? AND (active IS TRUE OR active IS NULL) AND status = 'archived'
            ORDER BY id ASC
        """, (caregiver_id,))
        return [dict(row) for row in c.fetchall()]

@app.post("/api/profiles")
def create_elderly_profile(p: ProfileCreate, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    now = datetime.datetime.now().isoformat()
    with get_db() as conn:
        try:
            c = conn.cursor()
            c.execute("""
                INSERT INTO elderly_profiles (caregiver_id, name, age, preferred_language, voice_enabled, created_at, updated_at, active, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'active')
            """, (caregiver_id, p.name.strip(), p.age, p.preferred_language, p.voice_enabled, now, now))
            profile_id = c.lastrowid

            # Sync to users table for backward compat
            c.execute("""
                INSERT INTO users (id, display_name, age, preferred_language, voice_enabled, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (profile_id, p.name.strip(), p.age, p.preferred_language, p.voice_enabled, now))
            conn.commit()
        except Exception as e:
            import traceback
            raise HTTPException(status_code=500, detail=f"Profile Create Error: {e}\n{traceback.format_exc()}")

        return {
            "id": profile_id,
            "display_name": p.name.strip(),
            "name": p.name.strip(),
            "age": p.age,
            "preferred_language": p.preferred_language,
            "voice_enabled": p.voice_enabled,
            "status": "active",
            "created_at": now
        }

@app.get("/api/profiles/{id}")
def get_profile(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT id, caregiver_id, name as display_name, name, age, preferred_language, voice_enabled, created_at, COALESCE(status, 'active') as status FROM elderly_profiles WHERE id = ? AND (active IS TRUE OR active IS NULL)", (id,))
        row = c.fetchone()
        if not row:
            c.execute("SELECT id, 1 as caregiver_id, display_name, display_name as name, age, preferred_language, voice_enabled, created_at, 'active' as status FROM users WHERE id = ?", (id,))
            row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Verify ownership
        if current and int(row["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Profile belongs to another caregiver account.")

        return dict(row)

@app.put("/api/profiles/{id}")
@app.patch("/api/profiles/{id}")
def update_profile(id: int, p: ProfileUpdate, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM elderly_profiles WHERE id = ? AND (active IS TRUE OR active IS NULL)", (id,))
        existing = c.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if current and int(existing["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Profile belongs to another caregiver account.")

        now = datetime.datetime.now().isoformat()
        new_name = p.name.strip() if p.name is not None else existing["name"]
        new_age = p.age if p.age is not None else existing["age"]
        new_lang = p.preferred_language if p.preferred_language is not None else existing["preferred_language"]
        new_voice = (1 if p.voice_enabled else 0) if p.voice_enabled is not None else existing["voice_enabled"]

        c.execute("""
            UPDATE elderly_profiles
            SET name = ?, age = ?, preferred_language = ?, voice_enabled = ?, updated_at = ?
            WHERE id = ?
        """, (new_name, new_age, new_lang, new_voice, now, id))

        # Update users table
        c.execute("UPDATE users SET display_name = ?, age = ?, preferred_language = ?, voice_enabled = ? WHERE id = ?",
                  (new_name, new_age, new_lang, new_voice, id))
        conn.commit()

        return {
            "id": id,
            "name": new_name,
            "display_name": new_name,
            "age": new_age,
            "preferred_language": new_lang,
            "voice_enabled": bool(new_voice),
            "status": existing["status"] if "status" in existing.keys() else "active"
        }

@app.post("/api/profiles/{id}/archive")
def archive_profile(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM elderly_profiles WHERE id = ? AND (active IS TRUE OR active IS NULL)", (id,))
        existing = c.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if current and int(existing["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot archive a profile owned by another caregiver.")

        c.execute("UPDATE elderly_profiles SET status = 'archived', updated_at = ? WHERE id = ?", (datetime.datetime.now().isoformat(), id))
        conn.commit()
        return {"status": "archived", "id": id}

@app.post("/api/profiles/{id}/restore")
def restore_profile(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM elderly_profiles WHERE id = ? AND (active IS TRUE OR active IS NULL)", (id,))
        existing = c.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if current and int(existing["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot restore a profile owned by another caregiver.")

        c.execute("UPDATE elderly_profiles SET status = 'active', updated_at = ? WHERE id = ?", (datetime.datetime.now().isoformat(), id))
        conn.commit()
        return {"status": "restored", "id": id}

@app.delete("/api/profiles/{id}")
def delete_profile_permanently(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM elderly_profiles WHERE id = ?", (id,))
        existing = c.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if current and int(existing["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot delete a profile owned by another caregiver.")

        # Cascading deletion of all profile-scoped data
        c.execute("DELETE FROM game_events WHERE user_id = ?", (id,))
        c.execute("DELETE FROM adaptive_decisions WHERE user_id = ?", (id,))
        c.execute("DELETE FROM game_sessions WHERE user_id = ?", (id,))
        c.execute("DELETE FROM sessions WHERE user_id = ?", (id,))
        c.execute("DELETE FROM familiar_people WHERE user_id = ?", (id,))
        c.execute("DELETE FROM reminders WHERE user_id = ?", (id,))
        c.execute("DELETE FROM elderly_profiles WHERE id = ?", (id,))
        c.execute("DELETE FROM users WHERE id = ?", (id,))
        conn.commit()

        return {"status": "permanently_deleted", "id": id}

@app.get("/api/profiles/{id}/export")
def export_profile_data(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM elderly_profiles WHERE id = ?", (id,))
        profile = c.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        if current and int(profile["caregiver_id"]) != int(caregiver_id):
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot export data of another caregiver's profile.")

        # Load profile-scoped data
        c.execute("SELECT * FROM sessions WHERE user_id = ?", (id,))
        sessions = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM game_sessions WHERE user_id = ?", (id,))
        game_sessions = [dict(r) for r in c.fetchall()]
        c.execute("SELECT id, name, relationship, consent_confirmed, created_at FROM familiar_people WHERE user_id = ?", (id,))
        familiar_people = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM reminders WHERE user_id = ?", (id,))
        reminders = [dict(r) for r in c.fetchall()]

        return {
            "profile": dict(profile),
            "export_timestamp": datetime.datetime.now().isoformat(),
            "total_sessions": len(sessions),
            "sessions": sessions,
            "game_sessions": game_sessions,
            "familiar_people": familiar_people,
            "reminders": reminders,
            "disclaimer": MEDICAL_DISCLAIMER,
        }

# --- BACKWARDS-COMPATIBILITY: /api/users ---

@app.get("/api/users")
def list_users():
    return _get_profiles_for_caregiver(1, False)

@app.post("/api/users")
def create_user(u: UserCreate):
    return create_elderly_profile(ProfileCreate(name=u.display_name, age=u.age, preferred_language=u.preferred_language, voice_enabled=u.voice_enabled), None)

@app.post("/api/users/demo")
def seed_demo_users():
    return seed_demo_scenarios(DB_FILE)

@app.get("/api/users/{id}")
def get_user_legacy(id: int):
    return get_profile(id)

# --- ENDPOINTS: SESSIONS ---

@app.post("/api/sessions")
@app.post("/api/sessions/start")
@app.post("/sessions/start")
def start_session(s: SessionStart, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, s.user_id)
        c = conn.cursor()
        now_dt = datetime.datetime.now()
        now = now_dt.isoformat()
        four_hours_ago = (now_dt - datetime.timedelta(hours=4)).isoformat()

        # Check for existing active/in_progress session created within last 4 hours
        c.execute("""
            SELECT id, started_at, status FROM sessions
            WHERE user_id = ? AND status IN ('active', 'in_progress') AND started_at >= ?
            ORDER BY id DESC LIMIT 1
        """, (s.user_id, four_hours_ago))
        existing_session = c.fetchone()
        if existing_session:
            return {"id": existing_session["id"], "user_id": s.user_id, "started_at": existing_session["started_at"], "status": existing_session["status"], "reused": True}

        c.execute(
            "INSERT INTO sessions (user_id, started_at, status) VALUES (?, ?, 'active')",
            (s.user_id, now)
        )
        conn.commit()
        return {"id": c.lastrowid, "user_id": s.user_id, "started_at": now, "status": "active"}

@app.post("/api/sessions/{id}/complete")
def complete_session(id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT user_id FROM sessions WHERE id = ?", (id,))
        row = c.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        check_caregiver_profile_access(conn, current, row["user_id"])
        now = datetime.datetime.now().isoformat()
        c.execute("UPDATE sessions SET completed_at = ?, status = 'completed' WHERE id = ?", (now, id))
        conn.commit()
        return {"id": id, "completed_at": now, "status": "completed"}

@app.get("/api/sessions/canonical-count/{user_id}")
def get_canonical_session_count(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as cnt FROM sessions WHERE user_id = ?", (user_id,))
        row = c.fetchone()
        count = row["cnt"] if row else 0
        c.execute("SELECT COUNT(*) as g_cnt FROM game_sessions WHERE user_id = ?", (user_id,))
        g_row = c.fetchone()
        game_count = g_row["g_cnt"] if g_row else 0
        return {"user_id": user_id, "session_count": count, "game_session_count": game_count}

@app.get("/api/sessions/user/{user_id}")
def list_user_sessions(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC", (user_id,))
        return [dict(row) for row in c.fetchall()]

@app.get("/api/sessions/{id}")
def get_session(id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM sessions WHERE id = ?", (id,))
        session = c.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        check_caregiver_profile_access(conn, current, session["user_id"])
        c.execute("SELECT * FROM game_sessions WHERE session_id = ?", (id,))
        game_sessions = [dict(row) for row in c.fetchall()]
        return {**dict(session), "game_sessions": game_sessions}

# --- ENDPOINTS: COMMUNITY MODE ---

class StartCommunitySessionRequest(BaseModel):
    name: str
    activity_type: str
    profile_ids: List[int]
    notes: Optional[str] = None
    force_new: Optional[bool] = False

class CompleteCommunitySessionRequest(BaseModel):
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    participant_notes: Optional[Dict[str, str]] = None

class RecordCommunityEventRequest(BaseModel):
    community_session_id: int
    profile_id: Optional[int] = None
    activity_key: str
    event_type: str
    data: Optional[Dict[str, Any]] = None

class TrustedConnectionRequest(BaseModel):
    profile_id: int
    contact_name: Optional[str] = ""
    display_name: Optional[str] = ""
    contact_type: Optional[str] = "mindmitra_user" # "mindmitra_user" | "external"
    relationship: str
    caregiver_name: Optional[str] = "Atchyuta Pavan Karthikeya"
    target_user_id: Optional[int] = None
    contact_user_id: Optional[int] = None
    phone_number: Optional[str] = ""
    phone_or_address: Optional[str] = ""
    status: Optional[str] = "approved"

class HeartbeatRequest(BaseModel):
    user_id: int
    session_id: Optional[str] = None

class MemoryStoryRequest(BaseModel):
    profile_id: int
    title: str
    audio_url: Optional[str] = ""
    transcript_text: Optional[str] = ""
    category: Optional[str] = "Life Memory"
    is_private: Optional[bool] = True

class WebRTCSignalRequest(BaseModel):
    caller_profile_id: int
    recipient_profile_id: Optional[int] = None
    target_user_id: Optional[int] = None
    signal_type: str
    payload: Optional[Dict[str, Any]] = None
    call_id: Optional[str] = None
    caller_name: Optional[str] = None

# In-memory WebRTC fallback
call_signals_queue: Dict[int, List[Dict[str, Any]]] = {}
user_presence: Dict[int, str] = {}

@app.post("/api/community/sessions/start")
@app.post("/community/sessions/start")
def start_community_session(req: StartCommunitySessionRequest, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    now_dt = datetime.datetime.now()
    now = now_dt.isoformat()
    four_hours_ago = (now_dt - datetime.timedelta(hours=4)).isoformat()

    with get_db() as conn:
        c = conn.cursor()

        # Check for duplicate / already in_progress session if not forcing new
        if not req.force_new:
            c.execute("""
                SELECT id, name, activity_type, started_at, status FROM community_sessions
                WHERE caregiver_id = ? AND status IN ('active', 'in_progress') AND started_at >= ?
                ORDER BY id DESC LIMIT 1
            """, (caregiver_id, four_hours_ago))
            existing = c.fetchone()
            if existing:
                c.execute("SELECT profile_id FROM community_participants WHERE community_session_id = ?", (existing["id"],))
                pids = [r["profile_id"] for r in c.fetchall()]
                return {
                    "id": existing["id"],
                    "name": existing["name"],
                    "activity_type": existing["activity_type"],
                    "started_at": existing["started_at"],
                    "status": "in_progress",
                    "profile_ids": pids if pids else req.profile_ids,
                    "reused": True
                }

        c.execute("""
            INSERT INTO community_sessions (caregiver_id, name, activity_type, started_at, status, notes)
            VALUES (?, ?, ?, ?, 'in_progress', ?)
        """, (caregiver_id, req.name, req.activity_type, now, req.notes or ""))
        session_id = c.lastrowid

        for pid in req.profile_ids:
            c.execute("""
                INSERT INTO community_participants (community_session_id, profile_id, attended)
                VALUES (?, ?, TRUE)
            """, (session_id, pid))
        conn.commit()

    return {"id": session_id, "name": req.name, "activity_type": req.activity_type, "started_at": now, "status": "in_progress", "profile_ids": req.profile_ids, "reused": False}

@app.post("/api/community/sessions/{id}/complete")
@app.post("/community/sessions/{id}/complete")
def complete_community_session(id: int, req: CompleteCommunitySessionRequest, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            UPDATE community_sessions
            SET completed_at = ?, status = 'completed', duration_minutes = ?, notes = ?
            WHERE id = ?
        """, (now, req.duration_minutes or 15, req.notes or "", id))

        if req.participant_notes:
            for pid_str, pnote in req.participant_notes.items():
                try:
                    pid = int(pid_str)
                    c.execute("""
                        UPDATE community_participants
                        SET notes = ?
                        WHERE community_session_id = ? AND profile_id = ?
                    """, (pnote, id, pid))
                except ValueError:
                    pass

        conn.commit()
    return {"status": "completed", "id": id, "completed_at": now}

@app.post("/api/community/sessions/{id}/abandon")
@app.post("/community/sessions/{id}/abandon")
def abandon_community_session(id: int, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute("UPDATE community_sessions SET completed_at = ?, status = 'abandoned' WHERE id = ?", (now, id))
        conn.commit()
    return {"status": "abandoned", "id": id, "completed_at": now}

@app.get("/api/community/sessions/caregiver/{caregiver_id}")
@app.get("/community/sessions/caregiver/{caregiver_id}")
def list_caregiver_community_sessions(caregiver_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT cs.*, COUNT(cp.id) as participant_count
            FROM community_sessions cs
            LEFT JOIN community_participants cp ON cs.id = cp.community_session_id
            WHERE cs.caregiver_id = ?
            GROUP BY cs.id
            ORDER BY cs.id DESC
        """, (caregiver_id,))
        sessions = [dict(row) for row in c.fetchall()]
        
        for s in sessions:
            c.execute("""
                SELECT cp.*, ep.name as profile_name
                FROM community_participants cp
                JOIN elderly_profiles ep ON cp.profile_id = ep.id
                WHERE cp.community_session_id = ?
            """, (s["id"],))
            s["participants"] = [dict(r) for r in c.fetchall()]

        return sessions

@app.get("/api/community/sessions/profile/{profile_id}")
@app.get("/community/sessions/profile/{profile_id}")
def list_profile_community_sessions(profile_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], profile_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()
        c.execute("""
            SELECT cs.*, cp.notes as participant_notes, cp.attended
            FROM community_sessions cs
            JOIN community_participants cp ON cs.id = cp.community_session_id
            WHERE cp.profile_id = ?
            ORDER BY cs.id DESC
        """, (profile_id,))
        return [dict(row) for row in c.fetchall()]

@app.post("/api/community/events")
@app.post("/community/events")
def record_community_event(req: RecordCommunityEventRequest, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now().isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO community_events (community_session_id, profile_id, activity_key, event_type, data_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            req.community_session_id, req.profile_id, req.activity_key, req.event_type,
            json.dumps(req.data or {}), now
        ))
        conn.commit()
        return {"id": c.lastrowid, "timestamp": now}

# --- ENDPOINTS: CONNECT MODE & TRUSTED CONNECTIONS ---

# --- ENDPOINTS: CONNECT MODE & TRUSTED CONNECTIONS ---

@app.get("/api/connections/profile/{profile_id}")
@app.get("/connections/profile/{profile_id}")
def get_profile_connections(profile_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], profile_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()
        c.execute("SELECT * FROM trusted_connections WHERE profile_id = ? ORDER BY id ASC", (profile_id,))
        rows = c.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            if not d.get("display_name"):
                d["display_name"] = d.get("contact_name") or "Contact"
            if not d.get("contact_type"):
                d["contact_type"] = "mindmitra_user" if (d.get("target_user_id") or d.get("contact_user_id")) else "external"
            if not d.get("target_user_id"):
                d["target_user_id"] = d.get("contact_user_id")
            if not d.get("caregiver_name"):
                d["caregiver_name"] = "Atchyuta Pavan Karthikeya"
            if not d.get("phone_number"):
                d["phone_number"] = d.get("phone_or_address") or ""
            result.append(d)
        return result

@app.post("/api/connections")
@app.post("/connections")
def add_trusted_connection(req: TrustedConnectionRequest, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], req.profile_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()
        display_name = req.display_name or req.contact_name or "Trusted Contact"
        contact_name = req.contact_name or display_name
        contact_type = req.contact_type or ("mindmitra_user" if req.target_user_id else "external")
        target_user_id = req.target_user_id or req.contact_user_id
        caregiver_name = req.caregiver_name or "Atchyuta Pavan Karthikeya"
        phone_number = req.phone_number or req.phone_or_address or ""

        c.execute("""
            INSERT INTO trusted_connections (
                profile_id, contact_name, display_name, contact_type, relationship,
                caregiver_name, target_user_id, contact_user_id, phone_number, phone_or_address,
                status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req.profile_id, contact_name, display_name, contact_type, req.relationship,
            caregiver_name, target_user_id, target_user_id, phone_number, phone_number,
            req.status or "approved", datetime.datetime.now().isoformat()
        ))
        conn.commit()
        return {
            "id": c.lastrowid,
            "status": req.status or "approved",
            "display_name": display_name,
            "contact_type": contact_type,
            "target_user_id": target_user_id
        }

@app.delete("/api/connections/{id}")
@app.delete("/connections/{id}")
def delete_trusted_connection(id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT profile_id FROM trusted_connections WHERE id = ?", (id,))
        row = c.fetchone()
        if row and current and not verify_profile_ownership(conn, current["caregiver_id"], row["profile_id"]):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c.execute("DELETE FROM trusted_connections WHERE id = ?", (id,))
        conn.commit()
        return {"status": "deleted", "id": id}

# --- ENDPOINTS: REAL-TIME WEBRTC CALL SIGNALING & PRESENCE (DATABASE-PERSISTED) ---

@app.post("/api/presence/heartbeat")
@app.post("/presence/heartbeat")
def record_presence_heartbeat(req: HeartbeatRequest, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    user_presence[req.user_id] = now
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM active_presence WHERE user_id = ?", (req.user_id,))
            c.execute("""
                INSERT INTO active_presence (user_id, active_session_id, online, last_heartbeat, updated_at)
                VALUES (?, ?, TRUE, ?, ?)
            """, (req.user_id, req.session_id or f"sess_{req.user_id}", now, now))
            conn.commit()
    except Exception as e:
        logger.warning(f"[Presence Heartbeat DB Warning] {e}")
    
    return {"status": "ok", "user_id": req.user_id, "timestamp": now}

def parse_heartbeat_timestamp(ts_val) -> Optional[datetime.datetime]:
    if not ts_val:
        return None
    if isinstance(ts_val, datetime.datetime):
        return ts_val.astimezone(datetime.timezone.utc).replace(tzinfo=None) if ts_val.tzinfo else ts_val
    try:
        s = str(ts_val).strip()
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.datetime.fromisoformat(s)
        if dt.tzinfo is not None:
            return dt.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return None

@app.get("/api/call/presence/{target_id}")
@app.get("/call/presence/{target_id}")
def get_call_presence(target_id: int):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT last_heartbeat FROM active_presence WHERE user_id = ?", (target_id,))
        row = c.fetchone()
        is_online = False
        last_seen_str = None
        if row:
            raw_ts = row["last_heartbeat"] if isinstance(row, dict) else row[0]
            last_seen_str = str(raw_ts) if raw_ts else None
            last_seen_dt = parse_heartbeat_timestamp(raw_ts)
            if last_seen_dt:
                now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                now_local = datetime.datetime.now()
                diff_utc = (now_utc - last_seen_dt).total_seconds()
                diff_local = (now_local - last_seen_dt).total_seconds()
                if abs(diff_utc) <= 45 or abs(diff_local) <= 45 or (-10 <= diff_utc <= 45):
                    is_online = True
        
        if not is_online and target_id in user_presence:
            mem_dt = parse_heartbeat_timestamp(user_presence[target_id])
            if mem_dt:
                now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                if abs((now_utc - mem_dt).total_seconds()) <= 45:
                    is_online = True

        return {"target_id": target_id, "online": is_online, "last_seen": last_seen_str}

@app.post("/api/call/signal")
@app.post("/call/signal")
def send_call_signal(req: WebRTCSignalRequest, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    target_id = req.target_user_id or req.recipient_profile_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing target_user_id or recipient_profile_id")
    
    with get_db() as conn:
        c = conn.cursor()
        caller_name = req.caller_name
        if not caller_name:
            try:
                c.execute("SELECT name FROM elderly_profiles WHERE id = ?", (req.caller_profile_id,))
                p_row = c.fetchone()
                if p_row and p_row["name"]:
                    caller_name = p_row["name"]
                else:
                    caller_name = f"Profile #{req.caller_profile_id}"
            except Exception:
                caller_name = f"Profile #{req.caller_profile_id}"

        caller_rel = "Trusted Contact"
        try:
            c.execute("SELECT relationship FROM trusted_connections WHERE profile_id = ? AND (target_user_id = ? OR contact_user_id = ?)", (req.caller_profile_id, target_id, target_id))
            rel_row = c.fetchone()
            if rel_row and rel_row.get("relationship"):
                caller_rel = rel_row["relationship"]
        except Exception:
            pass

        call_id = req.call_id or f"call_{req.caller_profile_id}_{target_id}"
        payload_str = json.dumps(req.payload) if req.payload is not None else "{}"

        # Insert signal into database table
        c.execute("""
            INSERT INTO call_signals (call_id, caller_profile_id, caller_name, caller_relationship, target_user_id, signal_type, payload, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        """, (call_id, req.caller_profile_id, caller_name, caller_rel, target_id, req.signal_type, payload_str, now))

        # Update caller heartbeat in presence table safely
        try:
            c.execute("DELETE FROM active_presence WHERE user_id = ?", (req.caller_profile_id,))
            c.execute("""
                INSERT INTO active_presence (user_id, active_session_id, online, last_heartbeat, updated_at)
                VALUES (?, ?, TRUE, ?, ?)
            """, (req.caller_profile_id, f"sess_{req.caller_profile_id}", now, now))
        except Exception:
            pass
            
        conn.commit()
        user_presence[req.caller_profile_id] = now
        return {"status": "queued", "signal_type": req.signal_type, "target_user_id": target_id}

@app.get("/api/call/signals/{target_user_id}")
@app.get("/call/signals/{target_user_id}")
def poll_call_signals(target_user_id: int):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute("DELETE FROM active_presence WHERE user_id = ?", (target_user_id,))
            c.execute("""
                INSERT INTO active_presence (user_id, active_session_id, online, last_heartbeat, updated_at)
                VALUES (?, ?, TRUE, ?, ?)
            """, (target_user_id, f"sess_{target_user_id}", now, now))
            conn.commit()
        except Exception:
            pass

        user_presence[target_user_id] = now

        # Fetch pending signals for this recipient
        c.execute("""
            SELECT id, call_id, caller_profile_id, caller_name, caller_relationship, target_user_id, signal_type, payload, created_at
            FROM call_signals
            WHERE target_user_id = ? AND status = 'pending'
            ORDER BY id ASC
        """, (target_user_id,))
        rows = c.fetchall()

        signals = []
        signal_ids = []
        for r in rows:
            d = dict(r)
            payload_data = None
            if d.get("payload"):
                try:
                    payload_data = json.loads(d["payload"])
                except:
                    payload_data = d["payload"]
            signals.append({
                "id": d["id"],
                "call_id": d["call_id"],
                "caller_profile_id": d["caller_profile_id"],
                "caller_name": d["caller_name"],
                "caller_relationship": d["caller_relationship"],
                "target_user_id": d["target_user_id"],
                "recipient_profile_id": d["target_user_id"],
                "signal_type": d["signal_type"],
                "payload": payload_data,
                "timestamp": str(d["created_at"])
            })
            signal_ids.append(d["id"])

        if signal_ids:
            for sid in signal_ids:
                c.execute("UPDATE call_signals SET status = 'delivered' WHERE id = ?", (sid,))
        
        old_cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)).isoformat()
        try:
            c.execute("DELETE FROM call_signals WHERE created_at < ?", (old_cutoff,))
        except Exception:
            pass

        conn.commit()
        return {"signals": signals, "target_user_id": target_user_id}
@app.post("/api/call/end")
@app.post("/call/end")
def end_call(req: WebRTCSignalRequest, current=Depends(get_current_caregiver)):
    now = datetime.datetime.now().isoformat()
    target_id = req.target_user_id or req.recipient_profile_id
    call_id = req.call_id or f"call_{req.caller_profile_id}_{target_id}"

    with get_db() as conn:
        c = conn.cursor()
        # Mark all pending signals for this call as completed
        c.execute("UPDATE call_signals SET status = 'ended' WHERE call_id = ?", (call_id,))
        
        # If target specified, send explicit hangup signal
        if target_id:
            c.execute("""
                INSERT INTO call_signals (call_id, caller_profile_id, caller_name, caller_relationship, target_user_id, signal_type, payload, status, created_at)
                VALUES (?, ?, ?, 'Trusted Contact', ?, 'hangup', '{}', 'pending', ?)
            """, (call_id, req.caller_profile_id, req.caller_name or "Caller", target_id, now))

        conn.commit()
        return {"status": "ended", "call_id": call_id}

# -------------------------------------------------------------
# Office Kit Cross-Device Synchronization Endpoints
# -------------------------------------------------------------
@app.post("/api/office-kit/publish")
@app.post("/office-kit/publish")
def publish_office_kit_packet(req: Dict[str, Any]):
    if not isinstance(req, dict):
        raise HTTPException(status_code=422, detail="Invalid payload: expected JSON object")

    pkt_id = req.get("id")
    if not pkt_id or not str(pkt_id).strip():
        raise HTTPException(status_code=422, detail="Invalid packet: missing required 'id'")
    pkt_id = str(pkt_id).strip()

    # Extract profile ID safely from top-level or profile object
    profile_val = req.get("profileId")
    if profile_val is None and isinstance(req.get("profile"), dict):
        profile_val = req["profile"].get("id")

    if profile_val is None:
        raise HTTPException(status_code=422, detail="Invalid packet: missing required 'profileId'")

    try:
        profile_id = int(profile_val)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Invalid packet: profile ID must be an integer")

    # Validate schemaVersion
    schema_version = str(req.get("schemaVersion", "1.0"))
    if schema_version not in ["1.0", "1"]:
        raise HTTPException(status_code=422, detail=f"Unsupported schemaVersion: {schema_version}. Expected '1.0'")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO office_kit_packets (id, profile_id, packet_json, created_at)
            VALUES (?, ?, ?, ?)
        """, (pkt_id, profile_id, json.dumps(req), now))
        conn.commit()
    return {"status": "published", "id": pkt_id, "schemaVersion": "1.0", "timestamp": now}


@app.get("/api/health")
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "MindMitra Behavioral Companion & Telemetry Layer",
        "disclaimer": MEDICAL_DISCLAIMER
    }


@app.get("/api/office-kit/latest")
@app.get("/office-kit/latest")
def get_latest_office_kit_packet(profile_id: Optional[int] = None):
    with get_db() as conn:
        c = conn.cursor()
        if profile_id is not None:
            c.execute("""
                SELECT id, profile_id, packet_json, created_at
                FROM office_kit_packets
                WHERE profile_id = ?
                ORDER BY created_at DESC LIMIT 1
            """, (profile_id,))
        else:
            c.execute("""
                SELECT id, profile_id, packet_json, created_at
                FROM office_kit_packets
                ORDER BY created_at DESC LIMIT 1
            """)
        row = c.fetchone()
        if not row:
            return {"packet": None}
        return {"packet": json.loads(row["packet_json"])}

@app.get("/api/office-kit/history")
@app.get("/office-kit/history")
def get_office_kit_history(profile_id: Optional[int] = None, limit: int = 20):
    with get_db() as conn:
        c = conn.cursor()
        if profile_id is not None:
            c.execute("""
                SELECT packet_json FROM office_kit_packets
                WHERE profile_id = ?
                ORDER BY created_at DESC LIMIT ?
            """, (profile_id, limit))
        else:
            c.execute("""
                SELECT packet_json FROM office_kit_packets
                ORDER BY created_at DESC LIMIT ?
            """, (limit,))
        rows = c.fetchall()
        packets = [json.loads(r["packet_json"]) for r in rows]
        return {"packets": packets}

# --- ENDPOINTS: MEMORY STORIES ---

@app.get("/api/stories/profile/{profile_id}")
@app.get("/stories/profile/{profile_id}")
def get_profile_stories(profile_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], profile_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()
        c.execute("SELECT * FROM memory_stories WHERE profile_id = ? ORDER BY id DESC", (profile_id,))
        return [dict(row) for row in c.fetchall()]

@app.post("/api/stories")
@app.post("/stories")
def create_memory_story(req: MemoryStoryRequest, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], req.profile_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()
        c.execute("""
            INSERT INTO memory_stories (profile_id, title, audio_url, transcript_text, category, is_private, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (req.profile_id, req.title, req.audio_url or "", req.transcript_text or "", req.category or "Life Memory", bool(req.is_private), datetime.datetime.now().isoformat()))
        conn.commit()
        return {"id": c.lastrowid, "title": req.title}

# --- ENDPOINTS: 3-DOMAIN SEPARATED OVERVIEW ---

@app.get("/api/analytics/domains-overview/{user_id}")
@app.get("/analytics/domains-overview/{user_id}")
def get_3domain_overview(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to profile")
        c = conn.cursor()

        # 1. Cognitive Performance
        c.execute("""
            SELECT COUNT(*) as completed_count
            FROM sessions
            WHERE user_id = ? AND (status = 'completed' OR status = 'Completed')
        """, (user_id,))
        cog_sessions = c.fetchone()["completed_count"] or 0

        # 2. Social Engagement
        c.execute("""
            SELECT COUNT(*) as community_count
            FROM community_participants
            WHERE profile_id = ? AND attended IS TRUE
        """, (user_id,))
        social_sessions = c.fetchone()["community_count"] or 0

        # 3. Care Support
        c.execute("SELECT COUNT(*) as rem_count FROM reminders WHERE user_id = ?", (user_id,))
        reminders_count = c.fetchone()["rem_count"] or 0

        c.execute("SELECT COUNT(*) as fam_count FROM familiar_people WHERE user_id = ?", (user_id,))
        familiar_count = c.fetchone()["fam_count"] or 0

        c.execute("SELECT COUNT(*) as conn_count FROM trusted_connections WHERE profile_id = ?", (user_id,))
        connections_count = c.fetchone()["conn_count"] or 0

        return {
            "cognitive": {
                "completed_sessions": cog_sessions,
                "domain_status": "Personalized Cognitive Loop Active"
            },
            "social": {
                "community_sessions_attended": social_sessions,
                "engagement_status": f"{social_sessions} community group activities recorded"
            },
            "support": {
                "reminders_count": reminders_count,
                "familiar_people_count": familiar_count,
                "trusted_contacts_count": connections_count
            }
        }

# --- ENDPOINTS: GAMES ---

@app.post("/api/games/session/start")
def start_game_session(gs: GameSessionStart, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, gs.user_id)
        c = conn.cursor()
        now = datetime.datetime.now().isoformat()
        c.execute(
            "INSERT INTO game_sessions (session_id, user_id, game_type, difficulty, started_at) VALUES (?, ?, ?, ?, ?)",
            (gs.session_id, gs.user_id, gs.game_type, gs.difficulty, now)
        )
        conn.commit()
        return {"id": c.lastrowid, **gs.dict(), "started_at": now}

@app.post("/api/games/session/{id}/complete")
def complete_game_session(id: int, data: GameSessionComplete, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        try:
            c = conn.cursor()
            c.execute("SELECT user_id FROM game_sessions WHERE id = ?", (id,))
            gs_row = c.fetchone()
            if gs_row:
                check_caregiver_profile_access(conn, current, gs_row["user_id"])
            now = datetime.datetime.now().isoformat()

            session_dict = {
                "completed_at": now,
                "accuracy": data.accuracy,
                "total_events": data.total_events,
                "avg_response_time_ms": data.avg_response_time_ms,
                "completion_time_ms": data.completion_time_ms,
                "difficulty": 2,
            }
            is_eligible, exclusion_reason = validate_session_quality(session_dict)

            c.execute("""
                UPDATE game_sessions 
                SET completed_at = ?, accuracy = ?, avg_response_time_ms = ?, 
                    total_events = ?, repeat_errors = ?, corrections = ?, completion_time_ms = ?,
                    invalid_for_trend = ?, exclusion_reason = ?
                WHERE id = ?
            """, (
                now, data.accuracy, data.avg_response_time_ms,
                data.total_events, data.repeat_errors, data.corrections, data.completion_time_ms,
                False if is_eligible else True, exclusion_reason if not is_eligible else None,
                id
            ))
            conn.commit()
            return {"id": id, "completed_at": now, "eligible_for_trend": is_eligible}
        except Exception as e:
            logger.error(f"[Games] Failed to complete game session id={id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to complete game session: {e}")

@app.post("/api/games/event")
def record_game_event(evt: GameEventRecord, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, evt.user_id)
        c = conn.cursor()
        c.execute(
            "INSERT INTO game_events (game_session_id, user_id, event_type, event_data_json, timestamp) VALUES (?, ?, ?, ?, ?)",
            (evt.game_session_id, evt.user_id, evt.event_type, json.dumps(evt.event_data), datetime.datetime.now().isoformat())
        )
        conn.commit()
        return {"status": "recorded"}

@app.get("/api/games/sessions/user/{user_id}")
def get_user_game_sessions(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("SELECT * FROM game_sessions WHERE user_id = ? ORDER BY id ASC", (user_id,))
        return [dict(row) for row in c.fetchall()]

@app.get("/api/games/sessions/user/{user_id}/{game_type}")
def get_user_game_sessions_by_type(user_id: int, game_type: str, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("SELECT * FROM game_sessions WHERE user_id = ? AND game_type = ? ORDER BY id ASC", (user_id, game_type))
        return [dict(row) for row in c.fetchall()]

# --- ENDPOINTS: ADAPTIVE AI ---

@app.post("/api/adaptive/recommend")
def adaptive_recommend(req: AdaptiveRecommendRequest, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, req.user_id)
    result = recommend_next_difficulty(
        user_id=req.user_id,
        game_type=req.game_type,
        metrics=req.current_metrics.dict(),
        current_difficulty=req.current_metrics.current_difficulty
    )

    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO adaptive_decisions (
                user_id, game_type, previous_difficulty, recommended_difficulty,
                recommendation, reason, model_used, confidence, features_json, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req.user_id, req.game_type, result["previous_difficulty"],
            result["recommended_difficulty"], result["recommendation"],
            result["reason"], result["model_used"], result["confidence"],
            json.dumps(req.current_metrics.dict()), datetime.datetime.now().isoformat()
        ))
        conn.commit()

    return result

@app.get("/api/adaptive/history/{user_id}")
def get_adaptive_history(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("SELECT * FROM adaptive_decisions WHERE user_id = ? ORDER BY id DESC", (user_id,))
        return [dict(row) for row in c.fetchall()]

# --- ENDPOINTS: LONGITUDINAL TREND ENGINE & BASELINE ---

@app.get("/api/analytics/baseline/{user_id}/{game_type}")
def get_baseline(user_id: int, game_type: str, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        check_caregiver_profile_access(conn, current, user_id)
        c = conn.cursor()
        c.execute("""
            SELECT g.* FROM game_sessions g
            JOIN sessions s ON g.session_id = s.id
            WHERE s.user_id = ? AND g.game_type = ? AND (s.status = 'completed' OR s.status = 'Completed')
            ORDER BY g.id ASC
        """, (user_id, game_type))
        raw_sessions = [dict(row) for row in c.fetchall()]

    eligible_sessions, _ = filter_eligible_sessions(raw_sessions)
    baseline = calculate_personal_baseline(eligible_sessions)
    if not baseline:
        return {
            "sufficient_data": False,
            "baseline_accuracy": None,
            "baseline_response_time": None,
            "sessions_used": len(eligible_sessions),
            "status": "insufficient_history"
        }

    return {
        "sufficient_data": len(eligible_sessions) >= MIN_TREND_SESSIONS,
        "baseline_accuracy": baseline["baseline_median"],
        "baseline_response_time": baseline["baseline_latency"],
        "sessions_used": baseline["sessions_used"],
        "details": baseline
    }

@app.get("/api/analytics/trends/{user_id}")
def get_trends(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c = conn.cursor()
        c.execute("""
            SELECT g.* FROM game_sessions g
            JOIN sessions s ON g.session_id = s.id
            WHERE s.user_id = ? AND (s.status = 'completed' OR s.status = 'Completed')
            ORDER BY g.id ASC
        """, (user_id,))
        raw_sessions = [dict(row) for row in c.fetchall()]

    game_types = ["memory_match", "daily_routine", "object_recognition", "pattern_recall"]
    domain_results = []

    for gt in game_types:
        res = analyze_domain_trend(gt, raw_sessions)
        curr = res.get("current") or {}
        base = res.get("baseline") or {}
        changes = res.get("changes") or {}
        domain_results.append({
            "game_type": gt,
            "domain": res["domain"],
            "domain_name": res["domain_label"],
            "domain_label": res["domain_label"],
            "domain_icon": res["domain_icon"],
            "status": res["status"],
            "trend": res["status"],
            "trend_label": res.get("trend_label") or res["status"].replace("_", " ").title(),
            "current_performance": curr.get("accuracy"),
            "current_latency_ms": curr.get("latency_ms"),
            "current_difficulty": curr.get("difficulty", 1),
            "baseline": base.get("accuracy") if isinstance(base, dict) else None,
            "baseline_latency_ms": base.get("latency_ms") if isinstance(base, dict) else None,
            "deviation": changes.get("accuracy_delta") if isinstance(changes, dict) else None,
            "latency_deviation_ms": changes.get("latency_percent_change") if isinstance(changes, dict) else None,
            "sessions_used": res["sessions_used"],
            "sessions_analyzed": res["sessions_used"],
            "total_recorded": res["total_recorded"],
            "supporting_sessions": res["supporting_sessions"],
            "reason_codes": res["reason_codes"],
            "reasons": res.get("reasons", res["reason_codes"]),
            "observation_note": res["observation_note"],
            "trend_description": res.get("trend_description", res["observation_note"]),
            "difficulty_context": res.get("difficulty_context"),
            "disclaimer": MEDICAL_DISCLAIMER,
        })

    return domain_results

@app.get("/api/analytics/overall-trend/{user_id}")
def get_overall_trend(user_id: int, current=Depends(get_current_caregiver)):
    trends = get_trends(user_id, current)
    return calculate_overall_behavioral_trend(trends)

@app.get("/api/analytics/cognitive-domains/{user_id}")
def get_cognitive_domains(user_id: int, current=Depends(get_current_caregiver)):
    return get_trends(user_id, current)

# --- ENDPOINTS: EXPLAINABLE AI ---

@app.post("/api/explain/insight")
async def explain_insight(trend_data: dict):
    return await generate_caregiver_insight(trend_data)

@app.get("/api/explain/insights/{user_id}")
async def get_all_insights(user_id: int, current=Depends(get_current_caregiver)):
    trends = get_trends(user_id, current)
    insights = []
    for t in trends:
        ai_resp = await generate_caregiver_insight(t)
        insights.append({
            "domain": t["domain"],
            "domain_label": t["domain_label"],
            "game_type": t["game_type"],
            "status": t["trend"],
            "evidence": t["observation_note"],
            "reason_codes": t["reason_codes"],
            "insight": ai_resp["explanation"],
            "provider": ai_resp["provider"],
            "tier": ai_resp.get("tier", 1),
            "disclaimer": MEDICAL_DISCLAIMER,
        })
    return insights

# --- ENDPOINTS: FAMILIAR PEOPLE ---

@app.get("/api/familiar-people/{user_id}")
def list_familiar_people(user_id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    logger.info(f"[GET /api/familiar-people/{user_id}] profile_id={user_id} caregiver_id={caregiver_id}")
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, caregiver_id, user_id):
            logger.warning(f"[GET /api/familiar-people/{user_id}] 403 Forbidden: caregiver_id={caregiver_id} denied access to profile_id={user_id}")
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c = conn.cursor()
        c.execute("SELECT * FROM familiar_people WHERE user_id = ? ORDER BY id ASC", (user_id,))
        rows = [dict(row) for row in c.fetchall()]
        return rows

@app.post("/api/familiar-people")
def add_familiar_person(fp: FamiliarPersonCreate, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    logger.info(f"[POST /api/familiar-people] profile_id={fp.user_id} caregiver_id={caregiver_id} name='{fp.name}'")
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, caregiver_id, fp.user_id):
            logger.warning(f"[POST /api/familiar-people] 403 Forbidden: caregiver_id={caregiver_id} denied access to profile_id={fp.user_id}")
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        
        c = conn.cursor()
        # Verify profile exists
        c.execute("SELECT id FROM elderly_profiles WHERE id = ?", (fp.user_id,))
        p_row = c.fetchone()
        if not p_row:
            c.execute("SELECT id FROM users WHERE id = ?", (fp.user_id,))
            u_row = c.fetchone()
            if not u_row:
                logger.warning(f"[POST /api/familiar-people] 404 Not Found: profile_id={fp.user_id}")
                raise HTTPException(status_code=404, detail=f"Profile with id {fp.user_id} not found")

        if not fp.photo_url or not fp.photo_url.strip():
            logger.warning(f"[POST /api/familiar-people] 400 Bad Request: missing photo_url for profile_id={fp.user_id}")
            raise HTTPException(status_code=400, detail="Photo is required for familiar person.")

        now = datetime.datetime.now().isoformat()
        try:
            c.execute("""
                INSERT INTO familiar_people (user_id, name, relationship, photo_url, consent_confirmed, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (fp.user_id, fp.name.strip(), fp.relationship.strip(), fp.photo_url, fp.consent_confirmed, now))
            conn.commit()
            new_id = c.lastrowid
            logger.info(f"[POST /api/familiar-people] 201 Created: new_id={new_id} profile_id={fp.user_id} caregiver_id={caregiver_id}")
            return {
                "id": new_id,
                "user_id": fp.user_id,
                "name": fp.name.strip(),
                "relationship": fp.relationship.strip(),
                "photo_url": fp.photo_url,
                "consent_confirmed": fp.consent_confirmed,
                "created_at": now
            }
        except Exception as e:
            logger.error(f"[POST /api/familiar-people] 500 DB Error: profile_id={fp.user_id} error={e}")
            raise HTTPException(status_code=500, detail=f"Database error saving familiar person: {str(e)}")

@app.put("/api/familiar-people/{id}")
@app.patch("/api/familiar-people/{id}")
def update_familiar_person(id: int, fp: FamiliarPersonUpdate, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    logger.info(f"[PUT /api/familiar-people/{id}] id={id} caregiver_id={caregiver_id}")
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM familiar_people WHERE id = ?", (id,))
        existing = c.fetchone()
        if not existing:
            logger.warning(f"[PUT /api/familiar-people/{id}] 404 Not Found: id={id}")
            raise HTTPException(status_code=404, detail="Familiar person not found")

        user_id = existing["user_id"]
        if current and not verify_profile_ownership(conn, caregiver_id, user_id):
            logger.warning(f"[PUT /api/familiar-people/{id}] 403 Forbidden: caregiver_id={caregiver_id} denied access to profile_id={user_id}")
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")

        new_name = fp.name.strip() if fp.name is not None else existing["name"]
        new_rel = fp.relationship.strip() if fp.relationship is not None else existing["relationship"]
        new_photo = fp.photo_url if fp.photo_url is not None else existing["photo_url"]
        new_consent = (1 if fp.consent_confirmed else 0) if fp.consent_confirmed is not None else existing["consent_confirmed"]

        try:
            c.execute("""
                UPDATE familiar_people
                SET name = ?, relationship = ?, photo_url = ?, consent_confirmed = ?
                WHERE id = ?
            """, (new_name, new_rel, new_photo, new_consent, id))
            conn.commit()
            logger.info(f"[PUT /api/familiar-people/{id}] 200 OK: updated id={id} profile_id={user_id}")
            return {
                "id": id,
                "user_id": user_id,
                "name": new_name,
                "relationship": new_rel,
                "photo_url": new_photo,
                "consent_confirmed": bool(new_consent)
            }
        except Exception as e:
            logger.error(f"[PUT /api/familiar-people/{id}] 500 DB Error: id={id} error={e}")
            raise HTTPException(status_code=500, detail=f"Database error updating familiar person: {str(e)}")

@app.delete("/api/familiar-people/{id}")
def delete_familiar_person(id: int, current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else 1
    logger.info(f"[DELETE /api/familiar-people/{id}] id={id} caregiver_id={caregiver_id}")
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT user_id FROM familiar_people WHERE id = ?", (id,))
        row = c.fetchone()
        if not row:
            return {"status": "deleted"}
        if current and not verify_profile_ownership(conn, caregiver_id, row["user_id"]):
            logger.warning(f"[DELETE /api/familiar-people/{id}] 403 Forbidden: caregiver_id={caregiver_id} denied access to profile_id={row['user_id']}")
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        try:
            c.execute("DELETE FROM familiar_people WHERE id = ?", (id,))
            conn.commit()
            logger.info(f"[DELETE /api/familiar-people/{id}] 200 OK: deleted id={id}")
            return {"status": "deleted"}
        except Exception as e:
            logger.error(f"[DELETE /api/familiar-people/{id}] 500 DB Error: id={id} error={e}")
            raise HTTPException(status_code=500, detail=f"Database error deleting familiar person: {str(e)}")

# --- ENDPOINTS: CLOUD TTS ---

@app.post("/api/tts")
async def generate_cloud_tts(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    lang = req.language.lower()
    tl = "te"
    if "hi" in lang:
        tl = "hi"
    elif "en" in lang:
        tl = "en"
    elif "te" in lang:
        tl = "te"

    encoded_text = urllib.parse.quote(text)
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={tl}&client=tw-ob&q={encoded_text}"

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(tts_url, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    audio_bytes = await resp.read()
                    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                    return {
                        "success": True,
                        "audio_base64": f"data:audio/mp3;base64,{b64_audio}",
                        "language": req.language,
                        "provider": "google_cloud_tts_fallback"
                    }
                else:
                    raise HTTPException(status_code=resp.status, detail="TTS service error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate TTS audio: {str(e)}")

# --- ENDPOINTS: REMINDERS ---

@app.get("/api/reminders/{user_id}")
def list_reminders(user_id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c = conn.cursor()
        c.execute("SELECT * FROM reminders WHERE user_id = ? ORDER BY id ASC", (user_id,))
        return [dict(row) for row in c.fetchall()]

@app.post("/api/reminders")
def create_reminder(rem: ReminderModel, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], rem.user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c = conn.cursor()
        c.execute("""
            INSERT INTO reminders (user_id, type, title, time, repeat_pattern, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (rem.user_id, rem.type, rem.title, rem.time, rem.repeat_pattern, rem.enabled, datetime.datetime.now().isoformat()))
        conn.commit()
        return {"id": c.lastrowid}

@app.put("/api/reminders/{id}")
def update_reminder(id: int, rem: ReminderModel, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        if current and not verify_profile_ownership(conn, current["caregiver_id"], rem.user_id):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c = conn.cursor()
        c.execute("""
            UPDATE reminders
            SET type = ?, title = ?, time = ?, repeat_pattern = ?, enabled = ?
            WHERE id = ?
        """, (rem.type, rem.title, rem.time, rem.repeat_pattern, rem.enabled, id))
        conn.commit()
        return {"status": "updated"}

@app.delete("/api/reminders/{id}")
def delete_reminder(id: int, current=Depends(get_current_caregiver)):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT user_id FROM reminders WHERE id = ?", (id,))
        row = c.fetchone()
        if not row:
            return {"status": "deleted"}
        if current and not verify_profile_ownership(conn, current["caregiver_id"], row["user_id"]):
            raise HTTPException(status_code=403, detail="Forbidden: Access denied to another caregiver's profile")
        c.execute("DELETE FROM reminders WHERE id = ?", (id,))
        conn.commit()
        return {"status": "deleted"}

# --- ENDPOINTS: SYNC ---

@app.get("/api/sync/status")
def sync_status():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) as count FROM sync_queue WHERE synced_at IS NULL")
        row = c.fetchone()
        return {"unsynced_items": row["count"]}

@app.post("/api/sync/simulate")
def sync_simulate():
    with get_db() as conn:
        c = conn.cursor()
        now = datetime.datetime.now().isoformat()
        c.execute("UPDATE sync_queue SET synced_at = ? WHERE synced_at IS NULL", (now,))
        conn.commit()
        return {"status": "synced"}

# --- ENDPOINTS: CENTRALIZED DEMO SEED ---

@app.post("/api/demo/seed")
def seed_demo_endpoint():
    return seed_demo_scenarios(DB_FILE)

@app.get("/api/debug/persistence")
def debug_persistence(current=Depends(get_current_caregiver)):
    caregiver_id = current["caregiver_id"] if current else None
    engine = get_engine_name()
    profile_count = 0
    with get_db() as conn:
        c = conn.cursor()
        if caregiver_id:
            c.execute("SELECT COUNT(*) as count FROM elderly_profiles WHERE caregiver_id = ? AND (active IS TRUE OR active IS NULL)", (caregiver_id,))
            res = c.fetchone()
            profile_count = res["count"] if res else 0
        else:
            c.execute("SELECT COUNT(*) as count FROM elderly_profiles WHERE (active IS TRUE OR active IS NULL)")
            res = c.fetchone()
            profile_count = res["count"] if res else 0

    return {
        "database_connected": True,
        "database_engine": engine,
        "database_url_configured": bool(DATABASE_URL),
        "database_file": DB_FILE if engine == "sqlite" else None,
        "authenticated_caregiver_id": caregiver_id,
        "profile_count": profile_count,
        "environment": "production" if os.getenv("VERCEL") or os.getenv("DATABASE_URL") else "development"
    }

@app.get("/api/debug/auth-health")
def debug_auth_health(authorization: Optional[str] = Header(None)):
    db_connected = False
    engine = "unknown"
    caregivers_table_exists = False
    postgres_load_error = None
    try:
        import psycopg2
    except Exception as e:
        import traceback
        postgres_load_error = f"{e}\n{traceback.format_exc()}"

    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT 1")
            db_connected = True
            engine = get_engine_name()
            if engine == "postgresql":
                c.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'caregivers')")
                res = c.fetchone()
                caregivers_table_exists = list(res.values())[0] if isinstance(res, dict) else res[0]
            else:
                c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='caregivers'")
                caregivers_table_exists = bool(c.fetchone())
    except Exception as e:
        logger.error(f"[Auth Health] Diagnostics failed: {e}")

    caregiver_id = None
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        payload = decode_access_token(token)
        if payload:
            caregiver_id = payload.get("caregiver_id")

    res_dict = {
        "database_connected": db_connected,
        "database_engine": engine,
        "caregivers_table_exists": bool(caregivers_table_exists),
        "auth_routes_loaded": True,
        "postgres_load_error": postgres_load_error,
        "environment": "production" if os.getenv("VERCEL") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") else "development"
    }
    if caregiver_id is not None:
        res_dict["authenticated_caregiver_id"] = caregiver_id

    return res_dict

@app.get("/api/debug/routes")
def debug_routes():
    return [r.path for r in app.routes if hasattr(r, 'path')]


@app.get("/api/debug/realtime-status")
@app.get("/debug/realtime-status")
def get_debug_realtime_status(current=Depends(get_current_caregiver)):
    now = datetime.datetime.now(datetime.timezone.utc)
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT user_id, active_session_id, online, last_heartbeat, updated_at FROM active_presence")
        rows = c.fetchall()
        presences = []
        for r in rows:
            d = dict(r)
            raw_ts = d.get("last_heartbeat")
            parsed_dt = parse_heartbeat_timestamp(raw_ts)
            diff_secs = (now.replace(tzinfo=None) - parsed_dt).total_seconds() if parsed_dt else None
            is_active = (0 <= diff_secs <= 30) if diff_secs is not None else False
            presences.append({
                "user_id": d["user_id"],
                "active_session_id": d.get("active_session_id"),
                "last_heartbeat": str(raw_ts),
                "seconds_ago": round(diff_secs, 1) if diff_secs is not None else None,
                "is_online": is_active
            })

        c.execute("SELECT id, call_id, caller_profile_id, caller_name, target_user_id, signal_type, status, created_at FROM call_signals ORDER BY id DESC LIMIT 10")
        recent_signals = [dict(sr) for sr in c.fetchall()]

        return {
            "realtime_configured": True,
            "authenticated_caregiver_id": current["caregiver_id"] if current else None,
            "server_time_utc": now.isoformat(),
            "active_presence_count": len(presences),
            "presences": presences,
            "recent_signals": recent_signals
        }

@app.get("/api/debug/test-signal")
@app.get("/debug/test-signal")
def debug_test_signal():
    import traceback
    try:
        with get_db() as conn:
            c = conn.cursor()
            # Ensure call_signals table exists
            c.execute("""
                CREATE TABLE IF NOT EXISTS call_signals (
                    id SERIAL PRIMARY KEY,
                    call_id TEXT,
                    caller_profile_id INTEGER,
                    caller_name TEXT,
                    caller_relationship TEXT,
                    target_user_id INTEGER,
                    signal_type TEXT,
                    payload TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP
                )
            """)
            conn.commit()
            
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()
            c.execute("""
                INSERT INTO call_signals (call_id, caller_profile_id, caller_name, caller_relationship, target_user_id, signal_type, payload, status, created_at)
                VALUES ('test_call', 1, 'Polayya', 'Neighbor', 2, 'offer', '{}', 'pending', ?)
            """, (now,))
            conn.commit()

            c.execute("SELECT * FROM call_signals WHERE target_user_id = 2")
            rows = [dict(r) for r in c.fetchall()]
            return {"status": "ok", "rows": rows}
    except Exception as e:
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
