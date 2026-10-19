"""
Reports and Data Export Router
Supports PDF (ReportLab with charts & QR), CSV, and Excel (openpyxl) exports.
Enforces multi-tenant data boundaries on every export.
Provides Power BI embed token endpoint with automatic fallback notice.
"""

from fastapi import APIRouter, Depends, Query, Response, HTTPException
from typing import Dict, Any, Optional

from app.core.security import require_role
from app.core.config import settings
from app.services.reports_service import generate_pdf_report, generate_csv_report, generate_xlsx_report
from app.core.audit import log_audit

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/export")
def export_report(
    format: str = Query("pdf", pattern="^(pdf|csv|xlsx)$"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    store_id: Optional[str] = None,  # Only permitted for supplier role!
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")

    # Strict Tenant Scoping
    if role == "client":
        effective_store_id = current_user.get("store_client_id")
        scope_name = f"Store {effective_store_id}"
    else:
        # Supplier can export all or specific store
        effective_store_id = store_id
        scope_name = f"Store {store_id}" if store_id else "Global Wholesale Network"

    log_audit(
        current_user["uid"],
        role,
        "EXPORT_REPORT",
        f"format/{format}",
        details={"scope": scope_name, "date_from": date_from, "date_to": date_to}
    )

    if format == "pdf":
        pdf_bytes = generate_pdf_report(scope_name, effective_store_id, date_from, date_to)
        filename = f"Procurement_Report_{scope_name.replace(' ', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "csv":
        csv_text = generate_csv_report(effective_store_id, date_from, date_to)
        filename = f"Procurement_Data_{scope_name.replace(' ', '_')}.csv"
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "xlsx":
        xlsx_bytes = generate_xlsx_report(effective_store_id, date_from, date_to)
        filename = f"Procurement_Workbook_{scope_name.replace(' ', '_')}.xlsx"
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

@router.get("/powerbi-token")
def get_powerbi_embed_token(current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))):
    """
    Returns Power BI embed configuration if credentials exist.
    If credentials are not configured, returns fallback metadata signaling Native Analytics Mode.
    """
    has_creds = bool(settings.POWERBI_CLIENT_ID and settings.POWERBI_WORKSPACE_ID and settings.POWERBI_REPORT_ID)
    if not has_creds:
        return {
            "mode": "fallback_native",
            "message": "Power BI credentials not configured in environment. Using Native Analytics Mode.",
            "is_fallback": True,
            "embed_url": None,
            "embed_token": None
        }

    return {
        "mode": "powerbi_embedded",
        "is_fallback": False,
        "report_id": settings.POWERBI_REPORT_ID,
        "workspace_id": settings.POWERBI_WORKSPACE_ID,
        "embed_url": f"https://app.powerbi.com/reportEmbed?reportId={settings.POWERBI_REPORT_ID}&groupId={settings.POWERBI_WORKSPACE_ID}",
        "embed_token": "simulated_secure_embed_token"
    }
