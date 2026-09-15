"""
MindMitra - Unified Database Adapter
Supports PostgreSQL (DATABASE_URL / POSTGRES_URL) for production serverless persistence
and SQLite (mindmitra.db) for offline development.
"""

import os
import sys
import logging
import sqlite3
import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager

logger = logging.getLogger("mindmitra.db")

raw_db_url = os.getenv("POSTGRES_URL_NON_POOLING") or os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
DATABASE_URL = None
if raw_db_url:
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1) if raw_db_url.startswith("postgres://") else raw_db_url

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.getenv("VERCEL"):
    DB_FILE = os.getenv("DB_FILE", "/tmp/mindmitra.db")
else:
    DB_FILE = os.getenv("DB_FILE", os.path.join(BASE_DIR, "mindmitra.db"))

HAS_POSTGRES = False
if DATABASE_URL:
    try:
        import psycopg2
        import psycopg2.extras
        HAS_POSTGRES = True
        logger.info("PostgreSQL configured via DATABASE_URL")
    except Exception as e:
        logger.warning(f"DATABASE_URL provided but psycopg2 failed to load ({e}). Falling back to SQLite.")

class DictRowWrapper(dict):
    """A dictionary that also supports index-based lookup like a tuple."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._keys = list(self.keys())

    def __getitem__(self, key):
        if isinstance(key, int):
            if 0 <= key < len(self._keys):
                return super().__getitem__(self._keys[key])
            raise IndexError("row index out of range")
        return super().__getitem__(key)

class UnifiedCursor:
    """Cursor wrapper translating parameter placeholders and row formats between SQLite and Postgres."""
    def __init__(self, raw_cursor, is_postgres: bool):
        self.cursor = raw_cursor
        self.is_postgres = is_postgres
        self.lastrowid = None

    def execute(self, sql: str, params: tuple = ()):
        formatted_sql = sql
        if self.is_postgres:
            # Replace SQLite '?' placeholders with Postgres '%s'
            formatted_sql = sql.replace("?", "%s")
            # Replace AUTOINCREMENT with SERIAL / IDENTITY
            formatted_sql = formatted_sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            formatted_sql = formatted_sql.replace("BOOLEAN DEFAULT 1", "BOOLEAN DEFAULT TRUE")
            formatted_sql = formatted_sql.replace("BOOLEAN DEFAULT 0", "BOOLEAN DEFAULT FALSE")
            formatted_sql = formatted_sql.replace("active = 1", "active IS TRUE")
            formatted_sql = formatted_sql.replace("active = 0", "active IS FALSE")

            # Append RETURNING clause for INSERT queries if not present
            if formatted_sql.strip().upper().startswith("INSERT INTO") and "RETURNING" not in formatted_sql.upper():
                if "ACTIVE_PRESENCE" in formatted_sql.upper():
                    formatted_sql = formatted_sql.rstrip(";") + " RETURNING user_id;"
                else:
                    formatted_sql = formatted_sql.rstrip(";") + " RETURNING id;"

        self.cursor.execute(formatted_sql, params or ())
        
        if self.is_postgres:
            if formatted_sql.strip().upper().startswith("INSERT INTO"):
                try:
                    res = self.cursor.fetchone()
                    if res:
                        self.lastrowid = res[0] if isinstance(res, (tuple, list)) else (res.get("id") or res.get("user_id"))
                except Exception:
                    pass
        else:
            self.lastrowid = getattr(self.cursor, 'lastrowid', None)

        return self

    def fetchone(self):
        row = self.cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, sqlite3.Row):
            return DictRowWrapper(dict(row))
        if hasattr(row, 'keys') or isinstance(row, dict):
            return DictRowWrapper(dict(row))
        if isinstance(row, (tuple, list)):
            if hasattr(self.cursor, 'description') and self.cursor.description:
                cols = [desc[0] for desc in self.cursor.description]
                return DictRowWrapper(dict(zip(cols, row)))
        return row

    def fetchall(self):
        rows = self.cursor.fetchall()
        if not rows:
            return []
        res = []
        for r in rows:
            if isinstance(r, sqlite3.Row):
                res.append(DictRowWrapper(dict(r)))
            elif isinstance(r, dict):
                res.append(DictRowWrapper(dict(r)))
            elif isinstance(r, (tuple, list)):
                if hasattr(self.cursor, 'description') and self.cursor.description:
                    cols = [desc[0] for desc in self.cursor.description]
                    res.append(DictRowWrapper(dict(zip(cols, r))))
                else:
                    res.append(r)
            else:
                res.append(r)
        return res

class UnifiedConnection:
    def __init__(self, conn, is_postgres: bool):
        self.conn = conn
        self.is_postgres = is_postgres

    def cursor(self):
        if self.is_postgres:
            import psycopg2.extras
            raw_cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            raw_cur = self.conn.cursor()
        return UnifiedCursor(raw_cur, self.is_postgres)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            try:
                self.conn.rollback()
            except Exception:
                pass
        else:
            try:
                self.conn.commit()
            except Exception:
                pass
        self.conn.close()

def get_engine_name() -> str:
    return "postgresql" if (HAS_POSTGRES and DATABASE_URL) else "sqlite"

def get_db_connection():
    if HAS_POSTGRES and DATABASE_URL:
        import psycopg2
        # Ensure sslmode=require for cloud Postgres if needed
        conn_url = DATABASE_URL
        if "sslmode" not in conn_url and "localhost" not in conn_url and "127.0.0.1" not in conn_url:
            if "?" in conn_url:
                conn_url += "&sslmode=require"
            else:
                conn_url += "?sslmode=require"
        raw_conn = psycopg2.connect(conn_url)
        return UnifiedConnection(raw_conn, is_postgres=True)
    else:
        # SQLite
        raw_conn = sqlite3.connect(DB_FILE)
        raw_conn.row_factory = sqlite3.Row
        return UnifiedConnection(raw_conn, is_postgres=False)

def sync_postgres_sequences(conn):
    if not getattr(conn, 'is_postgres', False):
        return
    tables = [
        "caregivers",
        "elderly_profiles",
        "users",
        "sessions",
        "game_sessions",
        "game_events",
        "adaptive_decisions",
        "reminders",
        "familiar_people",
        "trusted_connections",
        "call_signals",
        "sync_queue"
    ]
    cursor = conn.cursor()
    for table in tables:
        try:
            cursor.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
            res = cursor.fetchone()
            max_id_val = 0
            if res:
                if isinstance(res, dict):
                    max_id_val = list(res.values())[0] or 0
                elif isinstance(res, (list, tuple)):
                    max_id_val = res[0] or 0
                else:
                    max_id_val = int(res)
            
            if max_id_val > 0:
                cursor.execute(f"SELECT pg_get_serial_sequence('{table}', 'id')")
                seq_res = cursor.fetchone()
                seq_name = None
                if seq_res:
                    if isinstance(seq_res, dict):
                        seq_name = list(seq_res.values())[0]
                    elif isinstance(seq_res, (list, tuple)):
                        seq_name = seq_res[0]
                    else:
                        seq_name = str(seq_res)
                
                if seq_name:
                    cursor.execute(f"SELECT setval(%s, %s, true)", (seq_name, max_id_val))
                    logger.info(f"[DB Sync] Synced sequence for {table} to {max_id_val}")
        except Exception as e:
            logger.warning(f"[DB Sync] Failed to sync sequence for table {table}: {e}")

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        pass

