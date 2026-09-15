"""
MindMitra - Centralized Demo Data Service
Seeds Caregiver Account + 3 Isolated Elderly Sub-Profiles:
Caregiver: Pavan Kumar (pavan@mindmitra.com / mindmitra123)
  ├── Elderly Profile 1: Rajesh Kumar (Age 72) -> Scenario A (Stable)
  ├── Elderly Profile 2: Sunita Devi (Age 68)   -> Scenario C (Recent Change)
  └── Elderly Profile 3: Demo User (Age 70)     -> Scenario B (Improving)

All demonstration history is strictly isolated and labeled as 'DEMONSTRATION DATA'.
"""
import datetime
from typing import Dict, Any, List
from .auth_service import hash_password
from .db_adapter import get_db, sync_postgres_sequences

def seed_demo_scenarios(db_path: str = "mindmitra.db") -> Dict[str, Any]:
    """
    Seeds database with authenticated caregiver and completely isolated elderly sub-profiles.
    """
    db_ctx = get_db()
    conn = db_ctx.__enter__()
    c = conn.cursor()

    # Target ONLY demo caregiver (pavan@mindmitra.com / ID 1) and demo profile IDs (1, 2, 3)
    c.execute("SELECT id FROM caregivers WHERE email = 'pavan@mindmitra.com' OR id = 1")
    demo_cg = c.fetchone()
    if demo_cg:
        demo_cg_id = demo_cg[0]
        c.execute("SELECT id FROM elderly_profiles WHERE caregiver_id = ?", (demo_cg_id,))
        demo_prof_ids = list(set([r[0] for r in c.fetchall()] + [1, 2, 3]))
        
        prof_placeholders = ",".join("?" * len(demo_prof_ids))
        c.execute(f"DELETE FROM game_events WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM adaptive_decisions WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM game_sessions WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM sessions WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM familiar_people WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM reminders WHERE user_id IN ({prof_placeholders})", demo_prof_ids)
        c.execute(f"DELETE FROM elderly_profiles WHERE caregiver_id = ?", (demo_cg_id,))
        c.execute(f"DELETE FROM users WHERE id IN ({prof_placeholders})", demo_prof_ids)
        c.execute("DELETE FROM caregivers WHERE id = ?", (demo_cg_id,))

    now = datetime.datetime.now()

    # 1. Seed Primary Caregiver Account (Pavan Kumar)
    pwd_hash = hash_password("mindmitra123")
    c.execute("""
        INSERT INTO caregivers (id, name, email, password_hash, created_at, updated_at, active)
        VALUES (1, 'Pavan Kumar', 'pavan@mindmitra.com', ?, ?, ?, 1)
    """, (pwd_hash, now.isoformat(), now.isoformat()))

    # 2. Seed 3 Independent Elderly Sub-Profiles under Caregiver 1
    # Profile 1: Rajesh Kumar (Age 72) -> Scenario A (Stable)
    c.execute("""
        INSERT INTO elderly_profiles (id, caregiver_id, name, age, preferred_language, voice_enabled, created_at, updated_at, active, status)
        VALUES (1, 1, 'Rajesh Kumar', 72, 'en', 1, ?, ?, 1, 'active')
    """, (now.isoformat(), now.isoformat()))
    c.execute("""
        INSERT INTO users (id, display_name, age, preferred_language, voice_enabled, created_at)
        VALUES (1, 'Rajesh Kumar', 72, 'en', 1, ?)
    """, (now.isoformat(),))

    # Profile 2: Sunita Devi (Age 68) -> Scenario C (Recent Change in Routine & Memory)
    c.execute("""
        INSERT INTO elderly_profiles (id, caregiver_id, name, age, preferred_language, voice_enabled, created_at, updated_at, active, status)
        VALUES (2, 1, 'Sunita Devi', 68, 'hi', 1, ?, ?, 1, 'active')
    """, (now.isoformat(), now.isoformat()))
    c.execute("""
        INSERT INTO users (id, display_name, age, preferred_language, voice_enabled, created_at)
        VALUES (2, 'Sunita Devi', 68, 'hi', 1, ?)
    """, (now.isoformat(),))

    # Profile 3: Demo User (Age 70) -> Scenario B (Improving Progression)
    c.execute("""
        INSERT INTO elderly_profiles (id, caregiver_id, name, age, preferred_language, voice_enabled, created_at, updated_at, active, status)
        VALUES (3, 1, 'Demo User', 70, 'te', 1, ?, ?, 1, 'active')
    """, (now.isoformat(), now.isoformat()))
    c.execute("""
        INSERT INTO users (id, display_name, age, preferred_language, voice_enabled, created_at)
        VALUES (3, 'Demo User', 70, 'te', 1, ?)
    """, (now.isoformat(),))

    game_types = ["memory_match", "daily_routine", "object_recognition", "pattern_recall"]

    # 3. Seed Profile 1 (Rajesh Kumar) - 8 Stable Historical Sessions across all 4 games
    for s_idx in range(1, 9):
        s_date = now - datetime.timedelta(days=(9 - s_idx))
        s_time_str = s_date.isoformat()
        c.execute("""
            INSERT INTO sessions (id, user_id, started_at, completed_at, status)
            VALUES (?, 1, ?, ?, 'completed')
        """, (s_idx, s_time_str, s_time_str))

        for g_type in game_types:
            acc = round(0.82 + (s_idx % 3) * 0.02, 2)
            latency = round(2100 + (s_idx % 2) * 100, 1)
            c.execute("""
                INSERT INTO game_sessions (
                    session_id, user_id, game_type, difficulty, started_at, completed_at,
                    accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
                ) VALUES (?, 1, ?, 2, ?, ?, ?, ?, 10, 1, 1, 28000)
            """, (s_idx, g_type, s_time_str, s_time_str, acc, latency))

    # 4. Seed Profile 2 (Sunita Devi) - 7 Historical Sessions demonstrating RECENT CHANGE
    sunita_trajectory = [
        {"acc": 0.84, "latency": 1900.0, "errors": 1},
        {"acc": 0.86, "latency": 2000.0, "errors": 1},
        {"acc": 0.82, "latency": 2100.0, "errors": 1},
        {"acc": 0.78, "latency": 2400.0, "errors": 2},
        {"acc": 0.74, "latency": 2700.0, "errors": 3},
        {"acc": 0.72, "latency": 2800.0, "errors": 3},
        {"acc": 0.70, "latency": 2900.0, "errors": 4},
    ]

    for s_idx, data in enumerate(sunita_trajectory, start=10):
        s_date = now - datetime.timedelta(days=(8 - (s_idx - 9)))
        s_time_str = s_date.isoformat()
        c.execute("""
            INSERT INTO sessions (id, user_id, started_at, completed_at, status)
            VALUES (?, 2, ?, ?, 'completed')
        """, (s_idx, s_time_str, s_time_str))

        # Recent change in sequential memory & short term memory
        c.execute("""
            INSERT INTO game_sessions (
                session_id, user_id, game_type, difficulty, started_at, completed_at,
                accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
            ) VALUES (?, 2, 'daily_routine', 2, ?, ?, ?, ?, 10, ?, 2, 34000)
        """, (s_idx, s_time_str, s_time_str, data["acc"], data["latency"], data["errors"]))

        c.execute("""
            INSERT INTO game_sessions (
                session_id, user_id, game_type, difficulty, started_at, completed_at,
                accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
            ) VALUES (?, 2, 'memory_match', 2, ?, ?, ?, ?, 10, ?, 2, 34000)
        """, (s_idx, s_time_str, s_time_str, data["acc"], data["latency"], data["errors"]))

        # Visual recognition and Pattern remain stable
        c.execute("""
            INSERT INTO game_sessions (
                session_id, user_id, game_type, difficulty, started_at, completed_at,
                accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
            ) VALUES (?, 2, 'object_recognition', 2, ?, ?, 0.85, 2100.0, 10, 1, 1, 26000)
        """, (s_idx, s_time_str, s_time_str))

        c.execute("""
            INSERT INTO game_sessions (
                session_id, user_id, game_type, difficulty, started_at, completed_at,
                accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
            ) VALUES (?, 2, 'pattern_recall', 2, ?, ?, 0.82, 2200.0, 10, 1, 1, 27000)
        """, (s_idx, s_time_str, s_time_str))

    # 5. Seed Profile 3 (Demo User) - Improving Progression (78% -> 93%)
    for s_idx in range(20, 26):
        s_date = now - datetime.timedelta(days=(27 - s_idx))
        s_time_str = s_date.isoformat()
        c.execute("""
            INSERT INTO sessions (id, user_id, started_at, completed_at, status)
            VALUES (?, 3, ?, ?, 'completed')
        """, (s_idx, s_time_str, s_time_str))

        acc = round(0.78 + (s_idx - 20) * 0.03, 2)
        latency = round(2600.0 - (s_idx - 20) * 120.0, 1)
        for g_type in game_types:
            c.execute("""
                INSERT INTO game_sessions (
                    session_id, user_id, game_type, difficulty, started_at, completed_at,
                    accuracy, avg_response_time_ms, total_events, repeat_errors, corrections, completion_time_ms
                ) VALUES (?, 3, ?, 2, ?, ?, ?, ?, 10, 1, 1, 25000)
            """, (s_idx, g_type, s_time_str, s_time_str, acc, latency))

    # 6. Profile-Specific Familiar People (Strictly Isolated!)
    # Profile 1 (Rajesh Kumar): Anita, Ramesh, Lakshmi, Vikram
    rajesh_people = [
        (1, "Anita Kumar", "Daughter", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"),
        (1, "Ramesh Kumar", "Son", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"),
        (1, "Lakshmi Devi", "Wife", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"),
        (1, "Vikram Kumar", "Grandson", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"),
    ]
    for uid, name, rel, photo in rajesh_people:
        c.execute("""
            INSERT INTO familiar_people (user_id, name, relationship, photo_url, consent_confirmed, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
        """, (uid, name, rel, photo, now.isoformat()))

    # Profile 2 (Sunita Devi): Meera, Arun, Pooja (Different family members!)
    sunita_people = [
        (2, "Meera Sharma", "Daughter", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400"),
        (2, "Arun Sharma", "Son", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"),
        (2, "Pooja Sharma", "Granddaughter", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"),
    ]
    for uid, name, rel, photo in sunita_people:
        c.execute("""
            INSERT INTO familiar_people (user_id, name, relationship, photo_url, consent_confirmed, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
        """, (uid, name, rel, photo, now.isoformat()))

    # 7. Profile-Specific Reminders (Strictly Isolated!)
    # Profile 1 (Rajesh): Morning BP tablet & Midday Water
    c.execute("""
        INSERT INTO reminders (user_id, type, title, time, repeat_pattern, enabled, created_at)
        VALUES (1, 'medication', 'Morning Blood Pressure Tablet', '08:30 AM', 'Daily', 1, ?)
    """, (now.isoformat(),))
    c.execute("""
        INSERT INTO reminders (user_id, type, title, time, repeat_pattern, enabled, created_at)
        VALUES (1, 'hydration', 'Midday Water Intake', '12:30 PM', 'Daily', 1, ?)
    """, (now.isoformat(),))

    # Profile 2 (Sunita): Evening Walk & Night Calcium
    c.execute("""
        INSERT INTO reminders (user_id, type, title, time, repeat_pattern, enabled, created_at)
        VALUES (2, 'activity', 'Evening Walking Activity', '05:00 PM', 'Daily', 1, ?)
    """, (now.isoformat(),))
    c.execute("""
        INSERT INTO reminders (user_id, type, title, time, repeat_pattern, enabled, created_at)
        VALUES (2, 'medication', 'Night Calcium Tablet', '09:00 PM', 'Daily', 1, ?)
    """, (now.isoformat(),))

    # 8. Seed Profile-Specific Approved Trusted Connections (Type A MindMitra + Type B External)
    c.execute("DELETE FROM trusted_connections WHERE profile_id IN (1, 2, 3)")
    # Profile 1 (Rajesh / Polayya)
    c.execute("""
        INSERT INTO trusted_connections (
            profile_id, contact_name, display_name, contact_type, relationship,
            caregiver_name, target_user_id, contact_user_id, phone_number, phone_or_address,
            status, created_at
        ) VALUES (1, 'Leelu', 'Leelu', 'mindmitra_user', 'Neighbor', 'Atchyuta Pavan Karthikeya', 2, 2, '', 'Flat 4B, Courtyard', 'approved', ?)
    """, (now.isoformat(),))
    c.execute("""
        INSERT INTO trusted_connections (
            profile_id, contact_name, display_name, contact_type, relationship,
            caregiver_name, target_user_id, contact_user_id, phone_number, phone_or_address,
            status, created_at
        ) VALUES (1, 'Suresh', 'Suresh', 'external', 'Brother', 'Atchyuta Pavan Karthikeya', NULL, NULL, '+91 98765 43210', '+91 98765 43210', 'approved', ?)
    """, (now.isoformat(),))

    # Profile 2 (Sunita / Leelu)
    c.execute("""
        INSERT INTO trusted_connections (
            profile_id, contact_name, display_name, contact_type, relationship,
            caregiver_name, target_user_id, contact_user_id, phone_number, phone_or_address,
            status, created_at
        ) VALUES (2, 'Polayya', 'Polayya', 'mindmitra_user', 'Neighbor', 'Atchyuta Pavan Karthikeya', 1, 1, '', 'Flat 2A, Courtyard', 'approved', ?)
    """, (now.isoformat(),))
    c.execute("""
        INSERT INTO trusted_connections (
            profile_id, contact_name, display_name, contact_type, relationship,
            caregiver_name, target_user_id, contact_user_id, phone_number, phone_or_address,
            status, created_at
        ) VALUES (2, 'Anita', 'Anita', 'external', 'Daughter', 'Atchyuta Pavan Karthikeya', NULL, NULL, '+91 91234 56789', '+91 91234 56789', 'approved', ?)
    """, (now.isoformat(),))

    sync_postgres_sequences(conn)
    conn.commit()
    db_ctx.__exit__(None, None, None)

    return {
        "status": "seeded_caregiver_hierarchy",
        "caregiver": {
            "name": "Pavan Kumar",
            "email": "pavan@mindmitra.com",
            "password": "mindmitra123",
        },
        "profiles": [
            {"id": 1, "name": "Rajesh Kumar", "age": 72, "scenario": "A (Stable)", "sessions": 8},
            {"id": 2, "name": "Sunita Devi", "age": 68, "scenario": "C (Recent Change)", "sessions": 7},
            {"id": 3, "name": "Demo User", "age": 70, "scenario": "B (Improving)", "sessions": 6},
        ],
        "label": "DEMONSTRATION DATA",
    }
