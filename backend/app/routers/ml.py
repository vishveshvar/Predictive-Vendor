"""
Model Management & Retraining Router
Allows authorized suppliers to trigger background model retraining on fresh data.
"""

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from typing import Dict, Any
import logging
from datetime import datetime, timezone

from app.core.security import require_role
from ml_engine.train_model import train_and_evaluate
from app.services.ml_service import ml_service
from app.core.audit import log_audit

logger = logging.getLogger("app.ml_router")
router = APIRouter(prefix="/ml", tags=["ML Operations"], dependencies=[Depends(require_role(["supplier"]))])

def run_retrain_task(actor_uid: str):
    logger.info(f"Background ML retraining started by: {actor_uid}")
    try:
        metrics = train_and_evaluate()
        # Reload artifacts in ml_service
        ml_service._load_artifacts()
        logger.info(f"Background ML retraining finished. Winner: {metrics.get('selected_model')}")
    except Exception as e:
        logger.error(f"Retraining task failed: {e}")

@router.post("/retrain")
def trigger_retraining(
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(require_role(["supplier"]))
):
    background_tasks.add_task(run_retrain_task, current_user["uid"])
    log_audit(current_user["uid"], current_user["role"], "TRIGGER_RETRAIN", "ml_engine/pipeline")
    return {
        "status": "QUEUED",
        "message": "Model retraining task queued in background. New metrics will be published upon completion.",
        "queued_at": datetime.now(timezone.utc).isoformat()
    }
