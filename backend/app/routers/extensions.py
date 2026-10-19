"""
Extensions API Router
Exposes endpoints for the 5 advanced platform extensions:
1. Isolation Forest Anomaly Detection
2. Supplier Scorecard Analytics & Radar Coordinates
3. Smart Reorder & Purchase Order Workflow (+ PDF PO)
4. ABC/XYZ Inventory Classification Matrix
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from typing import Dict, Any, Optional

from app.core.security import require_role, get_current_user
from app.models.schemas import CreatePurchaseOrderRequest
from app.services.extension_service import extension_service
from app.core.audit import log_audit

router = APIRouter(prefix="/extensions", tags=["Platform Extensions"])

# -------------------------------------------------------------
# 1. ANOMALY DETECTION
# -------------------------------------------------------------
@router.get("/anomalies")
def get_anomalies(
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")
    store_id = current_user.get("store_client_id") if role == "client" else None
    return extension_service.detect_anomalies(store_client_id=store_id)

# -------------------------------------------------------------
# 2. SUPPLIER SCORECARD
# -------------------------------------------------------------
@router.get("/supplier-scorecard")
def get_supplier_scorecard(
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    return extension_service.get_supplier_scorecard()

# -------------------------------------------------------------
# 3. SMART REORDER & PURCHASE ORDER WORKFLOW
# -------------------------------------------------------------
@router.post("/purchase-orders", status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: CreatePurchaseOrderRequest,
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")
    store_id = current_user.get("store_client_id") if role == "client" else "STORE-001"

    try:
        po = extension_service.create_purchase_order(
            store_client_id=store_id,
            sku=payload.sku,
            quantity=payload.quantity,
            urgency=payload.urgency,
            notes=payload.notes
        )
        log_audit(current_user["uid"], role, "CREATE_PURCHASE_ORDER", f"po/{po['po_id']}", details={"sku": payload.sku, "qty": payload.quantity})
        return {
            "message": f"Purchase order {po['po_id']} submitted successfully",
            "purchase_order": po
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail={"code": "PO_ERROR", "message": str(ve)})

@router.get("/purchase-orders")
def list_purchase_orders(
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")
    store_id = current_user.get("store_client_id") if role == "client" else None
    orders = extension_service.get_purchase_orders(store_client_id=store_id)
    return {
        "purchase_orders": orders,
        "count": len(orders)
    }

@router.get("/purchase-orders/{po_id}/pdf")
def download_po_pdf(
    po_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    try:
        pdf_bytes = extension_service.generate_po_pdf(po_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=PurchaseOrder_{po_id}.pdf"}
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": str(ve)})

# -------------------------------------------------------------
# 4. ABC/XYZ INVENTORY MATRIX
# -------------------------------------------------------------
@router.get("/abc-xyz-matrix")
def get_abc_xyz_matrix(
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")
    store_id = current_user.get("store_client_id") if role == "client" else None
    return extension_service.get_abc_xyz_matrix(store_client_id=store_id)
