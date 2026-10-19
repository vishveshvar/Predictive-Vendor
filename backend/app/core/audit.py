"""
Audit Logging Service
Tracks sensitive actions (logins, exports, status changes, retrains, PO creations)
into the database audit_logs collection.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from app.services.db import db_service

logger = logging.getLogger("app.audit")

def log_audit(
    actor_uid: str,
    role: str,
    action: str,
    resource: str,
    ip: str = "127.0.0.1",
    details: Optional[dict] = None
):
    entry = {
        "actor_uid": actor_uid,
        "role": role,
        "action": action,
        "resource": resource,
        "ip": ip,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    try:
        db_service.audit_logs.insert_one(entry)
        logger.info(f"[AUDIT] Actor: {actor_uid} ({role}) | Action: {action} | Resource: {resource}")
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")
