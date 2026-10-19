"""
Notifications Router
Delivers in-app alerts and real-time Server-Sent Events (SSE) updates.
"""

import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from bson import ObjectId

from app.core.security import get_current_user
from app.services.db import db_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    uid = current_user["uid"]
    role = current_user["role"]
    store_id = current_user.get("store_client_id")

    # Match notifications addressed to UID, role, or store
    recipients = [uid]
    if store_id:
        recipients.append(f"usr_{store_id.lower().replace('-', '_')}")
    if role == "supplier":
        recipients.append("usr_supplier_001")

    notes = list(db_service.notifications.find({"recipient_uid": {"$in": recipients}}).sort("created_at", -1).limit(50))
    for n in notes:
        n["id"] = str(n.pop("_id"))

    unread_count = sum(1 for n in notes if not n.get("read", False))

    return {
        "unread_count": unread_count,
        "notifications": notes
    }

@router.patch("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        from bson import ObjectId
        query = {"_id": ObjectId(notification_id)}
    except Exception:
        query = {"_id": notification_id}

    db_service.notifications.update_one(query, {"$set": {"read": True}})
    return {"message": "Notification marked as read"}

@router.get("/stream")
async def stream_live_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Server-Sent Events (SSE) channel for real-time live alerts.
    """
    async def event_generator():
        # Send initial connection event
        yield f"event: connected\ndata: {json.dumps({'message': 'Connected to live alert stream', 'user': current_user['uid']})}\n\n"
        while True:
            await asyncio.sleep(15)  # heartbeat / check interval
            # Yield heartbeat
            yield f"event: ping\ndata: {json.dumps({'timestamp': asyncio.get_event_loop().time()})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
