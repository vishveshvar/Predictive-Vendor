"""
Conversational Analytics Agent Router
Serves predefined business intelligence queries powered by MongoDB aggregation pipelines.
Zero LLM dependencies; entirely deterministic, real numbers from the active database.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Dict, Any

from app.core.security import get_current_user
from app.services.chat_queries import chat_service
from app.core.audit import log_audit

router = APIRouter(prefix="/chat", tags=["Conversational Analytics"])

@router.get("/suggested")
def get_suggested_queries(current_user: Dict[str, Any] = Depends(get_current_user)):
    role = current_user.get("role", "client")
    return chat_service.get_suggested_queries(role)

@router.get("/predefined")
def execute_predefined_query(
    query_id: str = Query(..., description="ID of the predefined query to run"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    role = current_user.get("role", "client")
    store_client_id = current_user.get("store_client_id")

    try:
        response = chat_service.execute_query(
            query_id=query_id,
            role=role,
            store_client_id=store_client_id
        )

        log_audit(
            current_user["uid"],
            role,
            "CHAT_QUERY",
            f"query/{query_id}",
            details={"title": response.get("title")}
        )

        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail={"code": "QUERY_ERROR", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "INTERNAL_QUERY_ERROR", "message": str(e)})
