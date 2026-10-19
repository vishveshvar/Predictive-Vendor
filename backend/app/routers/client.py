"""
Client Analytics Portal Router
Provides strictly tenant-isolated endpoints for retail store owners.
The store_client_id is derived exclusively from the verified JWT claims.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
import pandas as pd

from app.core.security import require_role
from app.services.db import db_service

router = APIRouter(prefix="/client", tags=["Client Analytics"], dependencies=[Depends(require_role(["client"]))])

@router.get("/profitability")
def get_store_profitability(
    days: int = Query(30, ge=7, le=365),
    current_user: Dict[str, Any] = Depends(require_role(["client"]))
):
    store_id = current_user.get("store_client_id")
    if not store_id:
        raise HTTPException(status_code=400, detail={"code": "TENANT_ERROR", "message": "Missing store_client_id claim"})

    # Fetch transactions strictly scoped to current store
    txns = list(db_service.transactions.find({"store_client_id": store_id}).sort("date", -1).limit(days * 25))
    df = pd.DataFrame(txns)

    if df.empty:
        return {
            "store_client_id": store_id,
            "total_revenue": 0.0,
            "total_cost": 0.0,
            "gross_margin": 0.0,
            "margin_percentage": 0.0,
            "units_sold": 0,
            "daily_trend": []
        }

    df["date"] = pd.to_datetime(df["date"])
    total_rev = round(float(df["total_revenue"].sum()), 2)
    total_cost = round(float(df["total_cost"].sum()), 2)
    gross_margin = round(float(df["gross_margin"].sum()), 2)
    margin_pct = round((gross_margin / total_rev) * 100, 2) if total_rev > 0 else 0.0
    units_sold = int(df["units_sold"].sum())

    # Daily Trend (last 30 days)
    daily = df.groupby(df["date"].dt.strftime("%Y-%m-%d")).agg(
        revenue=("total_revenue", "sum"),
        cost=("total_cost", "sum"),
        margin=("gross_margin", "sum"),
        units=("units_sold", "sum")
    ).reset_index().sort_values("date").tail(days)

    daily_trend = [
        {
            "date": r["date"],
            "revenue": round(float(r["revenue"]), 2),
            "cost": round(float(r["cost"]), 2),
            "margin": round(float(r["margin"]), 2),
            "units": int(r["units"])
        }
        for _, r in daily.iterrows()
    ]

    # Category performance breakdown
    cat_breakdown = df.groupby("product_category").agg(
        revenue=("total_revenue", "sum"),
        margin=("gross_margin", "sum"),
        units=("units_sold", "sum")
    ).reset_index().sort_values("revenue", ascending=False)

    categories = [
        {
            "category": r["product_category"],
            "revenue": round(float(r["revenue"]), 2),
            "margin": round(float(r["margin"]), 2),
            "units": int(r["units"])
        }
        for _, r in cat_breakdown.iterrows()
    ]

    return {
        "store_client_id": store_id,
        "total_revenue": total_rev,
        "total_cost": total_cost,
        "gross_margin": gross_margin,
        "margin_percentage": margin_pct,
        "units_sold": units_sold,
        "daily_trend": daily_trend,
        "category_breakdown": categories
    }

@router.get("/inventory")
def get_store_inventory(current_user: Dict[str, Any] = Depends(require_role(["client"]))):
    store_id = current_user.get("store_client_id")
    snapshots = list(db_service.inventory_snapshots.find({"store_client_id": store_id}))
    products = {p["sku"]: p for p in db_service.products.find({})}

    inventory_items = []
    for s in snapshots:
        p = products.get(s["sku"], {})
        velocity = float(p.get("base_velocity", 4.0))
        stock = int(s.get("stock_level", 0))
        days_cover = round(stock / max(0.1, velocity), 1)

        # Risk indicator
        lead_time = int(p.get("supplier_lead_time_days", 7))
        if days_cover <= lead_time:
            risk = "Critical"
        elif days_cover <= lead_time + 3:
            risk = "High"
        elif days_cover <= lead_time + 7:
            risk = "Medium"
        else:
            risk = "Low"

        inventory_items.append({
            "sku": s["sku"],
            "product_name": p.get("name", s["sku"]),
            "product_category": p.get("product_category", "General"),
            "brand": p.get("brand", "Generic"),
            "stock_level": stock,
            "unit_cost": p.get("unit_cost", 0.0),
            "unit_price": p.get("unit_price", 0.0),
            "reorder_point": p.get("reorder_point", 20),
            "lead_time_days": lead_time,
            "days_stock_cover": days_cover,
            "risk_level": risk,
            "is_deadstock": p.get("is_deadstock", False)
        })

    # Sort so high-risk/critical items are first
    order_map = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    inventory_items.sort(key=lambda x: (order_map.get(x["risk_level"], 4), x["days_stock_cover"]))

    return {
        "store_client_id": store_id,
        "total_skus": len(inventory_items),
        "critical_count": sum(1 for i in inventory_items if i["risk_level"] == "Critical"),
        "high_risk_count": sum(1 for i in inventory_items if i["risk_level"] == "High"),
        "items": inventory_items
    }

@router.get("/orders")
def get_client_orders(current_user: Dict[str, Any] = Depends(require_role(["client"]))):
    store_id = current_user.get("store_client_id")
    orders = list(db_service.orders.find({"store_client_id": store_id}, {"_id": 0}).sort("created_at", -1))
    return {
        "store_client_id": store_id,
        "count": len(orders),
        "orders": orders
    }
