"""
Predictive Procurement & Restocking Router
Exposes ML demand forecasting, days to stockout, safety stock, and what-if simulation.
Enforces tenant isolation for clients while allowing supplier cross-store forecasting.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from app.models.schemas import RestockPredictRequest, RestockPredictResponse
from app.core.security import require_role
from app.services.ml_service import ml_service
from app.core.audit import log_audit

router = APIRouter(prefix="/predictions", tags=["ML Predictions"])

@router.post("/predict-restock", response_model=RestockPredictResponse)
def predict_restock(
    payload: RestockPredictRequest,
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")

    # Strict Tenant Isolation: clients can only predict for their own store!
    if role == "client":
        store_id = current_user.get("store_client_id")
        if not store_id:
            raise HTTPException(status_code=400, detail={"code": "TENANT_ERROR", "message": "Store client ID claim missing"})
    else:
        # Supplier can inspect any store
        store_id = payload.store_client_id or "STORE-001"

    try:
        prediction = ml_service.predict_restock(
            store_client_id=store_id,
            sku=payload.sku,
            price_override=payload.price_override,
            lead_time_override=payload.lead_time_override,
            promo_override=payload.promo_override
        )

        log_audit(
            current_user["uid"],
            role,
            "PREDICT_RESTOCK",
            f"sku/{payload.sku}",
            details={"store": store_id, "risk": prediction["risk_level"]}
        )

        return RestockPredictResponse(**prediction)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "ML_INFERENCE_ERROR", "message": str(e)})

@router.get("/metrics")
def get_model_metrics(current_user: Dict[str, Any] = Depends(require_role(["supplier"]))):
    metrics = ml_service.get_metrics()
    return metrics
