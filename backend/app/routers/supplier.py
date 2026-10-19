"""
Supplier Command Center Router
Provides cross-tenant aggregated sales, global demand, client performance,
and inventory health matrices for wholesale operations.
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
import numpy as np
import pandas as pd

from app.core.security import require_role
from app.services.db import db_service

router = APIRouter(prefix="/supplier", tags=["Supplier Operations"], dependencies=[Depends(require_role(["supplier"]))])

@router.get("/sales-summary")
def get_global_sales_summary():
    pipeline = [
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_revenue"},
            "total_cost": {"$sum": "$total_cost"},
            "gross_margin": {"$sum": "$gross_margin"},
            "total_units": {"$sum": "$units_sold"},
            "stockout_days": {"$sum": "$stockout_flag"}
        }}
    ]
    res = list(db_service.transactions.aggregate(pipeline))
    if not res:
        return {"total_revenue": 0.0, "total_units": 0, "gross_margin": 0.0, "active_stores": 0}

    data = res[0]
    total_rev = round(float(data["total_revenue"]), 2)
    total_cost = round(float(data["total_cost"]), 2)
    gross_margin = round(float(data["gross_margin"]), 2)
    margin_pct = round((gross_margin / total_rev) * 100, 2) if total_rev > 0 else 0.0

    store_count = db_service.stores.count_documents({})
    order_count = db_service.orders.count_documents({})
    open_rmas = db_service.rma_tickets.count_documents({"status": {"$in": ["Open", "In Review"]}})

    # Network daily revenue trend
    daily_txns = list(db_service.transactions.find().sort("date", -1).limit(750))
    daily_df = pd.DataFrame(daily_txns)
    daily_trend = []
    if not daily_df.empty:
        daily_df["date"] = pd.to_datetime(daily_df["date"])
        agg_daily = daily_df.groupby(daily_df["date"].dt.strftime("%Y-%m-%d")).agg(
            revenue=("total_revenue", "sum"),
            units=("units_sold", "sum")
        ).reset_index().sort_values("date").tail(30)
        daily_trend = [
            {"date": r["date"], "revenue": round(float(r["revenue"]), 2), "units": int(r["units"])}
            for _, r in agg_daily.iterrows()
        ]

    return {
        "total_revenue": total_rev,
        "total_cost": total_cost,
        "gross_margin": gross_margin,
        "margin_percentage": margin_pct,
        "total_units_sold": int(data["total_units"]),
        "active_partner_stores": store_count,
        "total_orders_processed": order_count,
        "open_rma_tickets": open_rmas,
        "stockout_frequency_rate": round((data["stockout_days"] / max(1, len(daily_txns))) * 100, 2),
        "daily_trend": daily_trend
    }

@router.get("/demand-aggregate")
def get_demand_aggregate():
    # Category demand
    cat_pipeline = [
        {"$group": {
            "_id": "$product_category",
            "revenue": {"$sum": "$total_revenue"},
            "units": {"$sum": "$units_sold"}
        }},
        {"$sort": {"revenue": -1}}
    ]
    cat_res = list(db_service.transactions.aggregate(cat_pipeline))
    categories = [
        {"category": r["_id"], "revenue": round(float(r["revenue"]), 2), "units": int(r["units"])}
        for r in cat_res
    ]

    # Regional demand
    reg_pipeline = [
        {"$group": {
            "_id": "$region",
            "revenue": {"$sum": "$total_revenue"},
            "units": {"$sum": "$units_sold"}
        }},
        {"$sort": {"revenue": -1}}
    ]
    reg_res = list(db_service.transactions.aggregate(reg_pipeline))
    regions = [
        {"region": r["_id"], "revenue": round(float(r["revenue"]), 2), "units": int(r["units"])}
        for r in reg_res
    ]

    return {
        "categories": categories,
        "regions": regions
    }

@router.get("/clients")
def get_clients_list():
    stores = list(db_service.stores.find({}, {"_id": 0}))
    client_records = []

    for s in stores:
        store_id = s["store_client_id"]
        order_count = db_service.orders.count_documents({"store_client_id": store_id})
        rma_count = db_service.rma_tickets.count_documents({"store_client_id": store_id})

        # Aggregated revenue for this store
        rev_pipeline = [
            {"$match": {"store_client_id": store_id}},
            {"$group": {"_id": None, "rev": {"$sum": "$total_revenue"}, "units": {"$sum": "$units_sold"}}}
        ]
        rev_res = list(db_service.transactions.aggregate(rev_pipeline))
        total_rev = round(rev_res[0]["rev"], 2) if rev_res else 0.0
        total_units = int(rev_res[0]["units"]) if rev_res else 0

        client_records.append({
            "store_client_id": store_id,
            "name": s["name"],
            "city": s["city"],
            "region": s["region"],
            "lat": s["lat"],
            "lng": s["lng"],
            "owner_email": s["owner_email"],
            "total_revenue": total_rev,
            "total_units": total_units,
            "order_count": order_count,
            "rma_count": rma_count,
            "status": "Active Partner"
        })

    return client_records

@router.get("/inventory-heatmap")
def get_inventory_health_matrix():
    """
    Returns store x category matrix of average days stock cover
    for the interactive heatmap.
    """
    stores = list(db_service.stores.find({}, {"_id": 0, "store_client_id": 1, "name": 1, "city": 1}))
    categories = list(db_service.products.distinct("product_category"))

    # Map product to category
    sku_to_cat = {p["sku"]: p["product_category"] for p in db_service.products.find({}, {"sku": 1, "product_category": 1})}

    snapshots = list(db_service.inventory_snapshots.find({}))
    # Group snapshots by (store, category)
    matrix_data: Dict[str, Dict[str, List[int]]] = {s["store_client_id"]: {c: [] for c in categories} for s in stores}

    for snap in snapshots:
        s_id = snap["store_client_id"]
        cat = sku_to_cat.get(snap["sku"])
        if s_id in matrix_data and cat in matrix_data[s_id]:
            matrix_data[s_id][cat].append(snap["stock_level"])

    cells = []
    for s in stores:
        s_id = s["store_client_id"]
        for cat in categories:
            stocks = matrix_data[s_id].get(cat, [])
            avg_stock = float(np.mean(stocks)) if stocks else 20.0
            # Rough velocity estimation
            days_cover = round(avg_stock / 3.5, 1)
            status = "critical" if days_cover < 7 else ("warning" if days_cover < 14 else "healthy")
            cells.append({
                "store_client_id": s_id,
                "store_name": s["name"],
                "category": cat,
                "avg_stock": round(avg_stock, 1),
                "days_cover": days_cover,
                "status": status
            })

    return {
        "stores": stores,
        "categories": categories,
        "cells": cells
    }
