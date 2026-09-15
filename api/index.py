import os
import sys
import logging

# MindMitra API v2.1 - Community, Connect, Memory Stories, 3-Domain Analytics
# Build marker: 2026-08-23-v2-final-architecture

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mindmitra.vercel")

# Ensure root, backend, and ml are in python module resolution path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, "backend")
ml_dir = os.path.join(root_dir, "ml")

for p in [root_dir, backend_dir, ml_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

logger.info(f"[Vercel Init] Paths: root={root_dir}")

from backend.main import app, init_db

# Initialize database schema in Vercel serverless environment
try:
    init_db()
    logger.info("[Vercel Init] Database schema OK.")
except Exception as e:
    logger.warning(f"[Vercel Initialization Notice] {e}")

# Canary route - if this exists, the lambda was rebuilt after 2026-08-23
@app.get("/api/canary")
def canary():
    return {"status": "v2.1-rebuilt", "build": "2026-08-23", "community_api": "deployed"}
