from fastapi import APIRouter
from datetime import datetime, timezone

from app.core.config import settings
from app.services.db import db_service
from app.services.ml_service import ml_service

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "engine": db_service.engine_name,
            "is_fallback": db_service.is_fallback,
            "connected": True
        },
        "ml_engine": {
            "ready": ml_service.is_ready,
            "version": ml_service.get_metrics().get("version", "1.0.0"),
            "selected_model": ml_service.get_metrics().get("selected_model", "XGBoostRegressor")
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
