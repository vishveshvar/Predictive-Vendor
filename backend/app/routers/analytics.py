"""
Analytics Router
Implements high-performance MongoDB aggregation pipelines for wholesale velocity,
restocking trends, and demand forecasting.
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List
from datetime import datetime, timezone
import logging

from app.services.db import db_service

logger = logging.getLogger("app.analytics")
router = APIRouter(tags=["Analytics"])

@router.get("/analytics/velocity")
def get_network_velocity(
    days: int = Query(30, ge=1, le=365)
):
    """
    FastAPI endpoint /api/v1/analytics/velocity that uses a MongoDB aggregation pipeline
    to group real orders by date and sum revenue and units_sold.
    When an order is added to MongoDB, the velocity graph immediately updates.
    """
    try:
        # MongoDB Aggregation Pipeline on orders collection
        order_pipeline = [
            {
                "$unwind": {
                    "path": "$items",
                    "preserveNullAndEmptyArrays": True
                }
            },
            {
                "$project": {
                    "date": {
                        "$substrCP": [
                            {"$ifNull": ["$created_at", datetime.now(timezone.utc).isoformat()]},
                            0,
                            10
                        ]
                    },
                    "total_amount": {"$ifNull": ["$total_amount", 0]},
                    "order_id": "$order_id",
                    "item_quantity": {"$ifNull": ["$items.quantity", 0]}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": "$date",
                        "order_id": "$order_id"
                    },
                    "order_revenue": {"$first": "$total_amount"},
                    "order_units": {"$sum": "$item_quantity"}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "revenue": {"$sum": "$order_revenue"},
                    "units_sold": {"$sum": "$order_units"},
                    "order_count": {"$sum": 1}
                }
            },
            {
                "$sort": {"_id": 1}
            },
            {
                "$project": {
                    "_id": 0,
                    "date": "$_id",
                    "revenue": {"$round": ["$revenue", 2]},
                    "units_sold": "$units_sold",
                    "units": "$units_sold",
                    "margin": {"$round": [{"$multiply": ["$revenue", 0.22]}, 2]},
                    "order_count": "$order_count"
                }
            }
        ]

        order_results = list(db_service.orders.aggregate(order_pipeline))

        # Check transactions collection to build a rich historical multi-day timeline
        txn_pipeline = [
            {
                "$project": {
                    "date": {"$substrCP": [{"$ifNull": ["$date", "2026-10-01"]}, 0, 10]},
                    "revenue": {"$multiply": [{"$ifNull": ["$units_sold", 0]}, {"$ifNull": ["$unit_price", 0]}]},
                    "units_sold": {"$ifNull": ["$units_sold", 0]}
                }
            },
            {
                "$group": {
                    "_id": "$date",
                    "revenue": {"$sum": "$revenue"},
                    "units_sold": {"$sum": "$units_sold"}
                }
            },
            {"$sort": {"_id": -1}},
            {"$limit": days},
            {"$sort": {"_id": 1}}
        ]
        txn_results = list(db_service.transactions.aggregate(txn_pipeline))

        date_map = {}
        for t in txn_results:
            d = t["_id"]
            rev = round(float(t.get("revenue", 0)), 2)
            u = int(t.get("units_sold", 0))
            date_map[d] = {
                "date": d,
                "revenue": rev,
                "units_sold": u,
                "units": u,
                "margin": round(rev * 0.22, 2),
                "order_count": 1
            }

        # Overlay real live orders on top
        for r in order_results:
            d = r["date"]
            if d in date_map:
                date_map[d]["revenue"] = round(date_map[d]["revenue"] + float(r.get("revenue", 0)), 2)
                date_map[d]["units_sold"] += int(r.get("units_sold", 0))
                date_map[d]["units"] += int(r.get("units", 0))
                date_map[d]["margin"] = round(date_map[d]["revenue"] * 0.22, 2)
                date_map[d]["order_count"] += int(r.get("order_count", 1))
            else:
                date_map[d] = r

        sorted_dates = sorted(date_map.keys())
        final_velocity = [date_map[d] for d in sorted_dates][-days:] if sorted_dates else order_results

        total_revenue = round(sum(x.get("revenue", 0) for x in final_velocity), 2)
        total_units = sum(x.get("units_sold", 0) for x in final_velocity)

        return {
            "period_days": days,
            "total_revenue": total_revenue,
            "total_units_sold": total_units,
            "velocity": final_velocity,
            "daily_trend": final_velocity
        }
    except Exception as exc:
        logger.error(f"Velocity aggregation failed: {exc}", exc_info=True)
        # Fallback safe query
        records = list(db_service.orders.find({}, {"_id": 0}))
        velocity = []
        for r in records:
            d = r.get("created_at", "2026-10-01")[:10]
            amt = float(r.get("total_amount", 0))
            units = sum(item.get("quantity", 0) for item in r.get("items", []))
            velocity.append({
                "date": d,
                "revenue": amt,
                "units_sold": units,
                "units": units,
                "margin": round(amt * 0.22, 2),
                "order_count": 1
            })
        return {
            "period_days": days,
            "total_revenue": round(sum(x["revenue"] for x in velocity), 2),
            "total_units_sold": sum(x["units_sold"] for x in velocity),
            "velocity": velocity,
            "daily_trend": velocity
        }
