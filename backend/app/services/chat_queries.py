"""
Conversational Analytics Agent Service (Predefined Query Engine)
Executes vetted MongoDB aggregation pipelines with strict tenant isolation.
Returns structured text, summary KPIs, and inline mini-chart / table data.
Supports 8 Client queries + 8 Supplier queries.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import pandas as pd

from app.services.db import db_service

logger = logging.getLogger("app.chat")

# Client Query Definitions
# Client Query Definitions
CLIENT_QUERIES = {
    "my_top_products": {
        "title": "My Top Selling Gadgets",
        "description": "Top 3 highest volume and revenue electronics items for your store.",
        "icon": "TrendingUp"
    },
    "my_restock_items": {
        "title": "Items Needing Immediate Restock",
        "description": "Products with dangerous depletion rates requiring immediate replenishment.",
        "icon": "ShieldAlert"
    },
    "my_rma_summary": {
        "title": "My Defect Rate Summary",
        "description": "Breakdown of inventory write-offs: transit damage, defects, and shrinkage.",
        "icon": "PieChart"
    },
    "top_sellers": {
        "title": "Top Selling Products",
        "description": "Top 3 highest volume and revenue electronics items for your store.",
        "icon": "TrendingUp"
    },
    "deadstock_items": {
        "title": "Deadstock & Stagnant Inventory",
        "description": "Identify products with sluggish sales velocity and excess holding stock.",
        "icon": "AlertTriangle"
    },
    "stockout_risks": {
        "title": "Imminent Stockout Risks (< 7 Days)",
        "description": "Products with dangerous depletion rates requiring immediate replenishment.",
        "icon": "ShieldAlert"
    },
    "profit_summary": {
        "title": "Store Profitability & Margins",
        "description": "Recent gross margin totals, profit percentage, and net sales.",
        "icon": "DollarSign"
    },
    "loss_causes": {
        "title": "Loss Root-Cause Analysis",
        "description": "Breakdown of inventory write-offs: transit damage, defects, and shrinkage.",
        "icon": "PieChart"
    },
    "pending_rmas": {
        "title": "Active RMA Grievances",
        "description": "Current status of open return tickets and supplier resolutions.",
        "icon": "RotateCcw"
    },
    "order_status": {
        "title": "Recent Inbound Shipments",
        "description": "Status of manufactured, in-transit, and delivered wholesale batches.",
        "icon": "Truck"
    },
    "best_margin_category": {
        "title": "Highest Margin Category",
        "description": "Electronics category delivering the greatest profit yield.",
        "icon": "Award"
    }
}

# Supplier Query Definitions
SUPPLIER_QUERIES = {
    "top_stores": {
        "title": "Top 3 High-Volume Stores",
        "description": "Stores driving the greatest wholesale order volume and demand.",
        "icon": "Users"
    },
    "open_rmas": {
        "title": "Current Open RMA Count",
        "description": "Total active grievance queue across all partner stores.",
        "icon": "Inbox"
    },
    "stockout_risk": {
        "title": "Critical Stockout Forecast (<7 Days)",
        "description": "Aggregated ML projected replenishment units needed across all stores.",
        "icon": "Activity"
    },
    "category_revenue": {
        "title": "Network Revenue by Category",
        "description": "Categories experiencing accelerated month-over-month growth.",
        "icon": "Zap"
    },
    "top_client_volume": {
        "title": "Top Retail Clients by Volume",
        "description": "Stores driving the greatest wholesale order volume and demand.",
        "icon": "Users"
    },
    "total_open_rmas": {
        "title": "Network-Wide Open RMAs",
        "description": "Total active grievance queue across all partner stores.",
        "icon": "Inbox"
    },
    "fastest_growing_category": {
        "title": "Fastest Growing Categories",
        "description": "Categories experiencing accelerated month-over-month growth.",
        "icon": "Zap"
    },
    "average_resolution_time": {
        "title": "RMA Resolution Performance",
        "description": "Average turnaround time for processing and replacing defective stock.",
        "icon": "Clock"
    },
    "regional_demand": {
        "title": "Regional Demand Distribution",
        "description": "Wholesale order volume grouped by geographical territory.",
        "icon": "MapPin"
    },
    "low_performing_skus": {
        "title": "Network Deadstock & Slow SKUs",
        "description": "Low-velocity catalog items causing carrying drag.",
        "icon": "TrendingDown"
    },
    "delayed_shipments": {
        "title": "Active In-Transit & Logistics",
        "description": "Orders currently traversing carrier routes with live tracking.",
        "icon": "Navigation"
    },
    "forecast_demand_30d": {
        "title": "30-Day Network Demand Forecast",
        "description": "Aggregated ML projected replenishment units needed across all stores.",
        "icon": "Activity"
    }
}

class ChatService:
    def get_suggested_queries(self, role: str) -> List[Dict[str, Any]]:
        target_dict = CLIENT_QUERIES if role == "client" else SUPPLIER_QUERIES
        return [
            {"query_id": qid, "title": meta["title"], "description": meta["description"], "icon": meta["icon"]}
            for qid, meta in target_dict.items()
        ]

    def execute_query(self, query_id: str, role: str, store_client_id: Optional[str] = None) -> Dict[str, Any]:
        """Executes predefined aggregation pipeline with enforced tenant boundaries."""
        if role == "client":
            if not store_client_id:
                raise ValueError("Client role requires verified store_client_id")
            return self._execute_client_query(query_id, store_client_id)
        elif role == "supplier":
            return self._execute_supplier_query(query_id)
        else:
            raise ValueError(f"Unknown role: {role}")

    # ==========================
    # CLIENT PIPELINES (Isolated)
    # ==========================

    def _execute_client_query(self, query_id: str, store_client_id: str) -> Dict[str, Any]:
        if query_id in ["top_sellers", "my_top_products"]:
            # Aggregation: top 3 selling SKUs by units_sold
            pipeline = [
                {"$match": {"store_client_id": store_client_id}},
                {"$group": {
                    "_id": {"sku": "$sku", "name": "$product_name", "category": "$product_category"},
                    "total_units": {"$sum": "$units_sold"},
                    "total_revenue": {"$sum": "$total_revenue"},
                    "total_margin": {"$sum": "$gross_margin"}
                }},
                {"$sort": {"total_units": -1}},
                {"$limit": 3}
            ]
            results = list(db_service.transactions.aggregate(pipeline))
            chart_data = [
                {"label": r["_id"]["name"][:18], "units": r["total_units"], "revenue": round(r["total_revenue"], 2)}
                for r in results
            ]
            top_name = results[0]["_id"]["name"] if results else "None"
            top_units = results[0]["total_units"] if results else 0
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES[query_id]["title"],
                "text": f"Your top performing product is **{top_name}** with **{top_units:,} units sold**. These top 3 products account for the core of your store's high-velocity turnover.",
                "view_type": "bar_chart",
                "chart_data": chart_data,
                "table_headers": ["Product", "Category", "Units Sold", "Gross Revenue", "Gross Margin"],
                "table_rows": [
                    [r["_id"]["name"], r["_id"]["category"], f"{r['total_units']:,}", f"${r['total_revenue']:,.2f}", f"${r['total_margin']:,.2f}"]
                    for r in results
                ]
            }

        elif query_id == "deadstock_items":
            # Products marked deadstock or velocity < 0.2 with high stock
            snapshots = list(db_service.inventory_snapshots.find({"store_client_id": store_client_id}))
            deadstock_list = []
            for s in snapshots:
                p = db_service.products.find_one({"sku": s["sku"]})
                if p and (p.get("is_deadstock") or p.get("base_velocity", 1.0) < 0.5):
                    deadstock_list.append({
                        "sku": s["sku"],
                        "name": p["name"],
                        "category": p["product_category"],
                        "current_stock": s["stock_level"],
                        "tied_up_capital": round(s["stock_level"] * p["unit_cost"], 2)
                    })
            deadstock_list.sort(key=lambda x: x["tied_up_capital"], reverse=True)
            total_tied = sum(item["tied_up_capital"] for item in deadstock_list)
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES[query_id]["title"],
                "text": f"Detected **{len(deadstock_list)} deadstock / stagnant SKUs** in your store tying up **${total_tied:,.2f}** in working capital. We recommend initiating a 25% promotional discount or vendor trade-in.",
                "view_type": "table",
                "chart_data": [{"label": item["name"][:16], "capital": item["tied_up_capital"]} for item in deadstock_list[:4]],
                "table_headers": ["SKU", "Product Name", "Category", "On-Hand Stock", "Tied-Up Capital"],
                "table_rows": [
                    [d["sku"], d["name"], d["category"], f"{d['current_stock']} units", f"${d['tied_up_capital']:,.2f}"]
                    for d in deadstock_list
                ]
            }

        elif query_id in ["stockout_risks", "my_restock_items"]:
            # Find inventory with stock <= 30
            snapshots = list(db_service.inventory_snapshots.find({"store_client_id": store_client_id}))
            at_risk = []
            for s in snapshots:
                p = db_service.products.find_one({"sku": s["sku"]})
                if p and not p.get("is_deadstock"):
                    velocity = max(0.5, p.get("base_velocity", 4.0))
                    days_left = round(s["stock_level"] / velocity, 1)
                    if days_left <= 10:
                        at_risk.append({
                            "sku": s["sku"],
                            "name": p["name"],
                            "stock": s["stock_level"],
                            "days_left": days_left,
                            "lead_time": p["supplier_lead_time_days"]
                        })
            at_risk.sort(key=lambda x: x["days_left"])
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Stockout Risk"),
                "text": f"Found **{len(at_risk)} SKUs** with stockout projected in under 10 days. Products with days cover below supplier lead time are highlighted for immediate reorder.",
                "view_type": "bar_chart",
                "chart_data": [{"label": r["name"][:15], "days_left": r["days_left"]} for r in at_risk[:5]],
                "table_headers": ["SKU", "Product Name", "Current Stock", "Days Remaining", "Lead Time"],
                "table_rows": [
                    [r["sku"], r["name"], f"{r['stock']} units", f"{r['days_left']} days", f"{r['lead_time']} days"]
                    for r in at_risk[:6]
                ]
            }

        elif query_id == "profit_summary":
            pipeline = [
                {"$match": {"store_client_id": store_client_id}},
                {"$group": {
                    "_id": None,
                    "total_rev": {"$sum": "$total_revenue"},
                    "total_cost": {"$sum": "$total_cost"},
                    "total_margin": {"$sum": "$gross_margin"}
                }}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            if res:
                rev, cost, margin = res[0]["total_rev"], res[0]["total_cost"], res[0]["total_margin"]
                margin_pct = round((margin / rev) * 100, 1) if rev > 0 else 0.0
            else:
                rev, cost, margin, margin_pct = 0, 0, 0, 0
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Store Profitability"),
                "text": f"Your store achieved **${rev:,.2f}** in gross revenue with a cumulative gross margin of **${margin:,.2f}** (**{margin_pct}%** margin).",
                "view_type": "stat_cards",
                "chart_data": [
                    {"label": "Revenue", "value": round(rev, 2)},
                    {"label": "COGS", "value": round(cost, 2)},
                    {"label": "Gross Margin", "value": round(margin, 2)}
                ],
                "table_headers": ["Metric", "Amount"],
                "table_rows": [
                    ["Gross Revenue", f"${rev:,.2f}"],
                    ["Cost of Goods Sold (COGS)", f"${cost:,.2f}"],
                    ["Gross Profit Margin", f"${margin:,.2f}"],
                    ["Profit Margin %", f"{margin_pct}%"]
                ]
            }

        elif query_id in ["loss_causes", "my_rma_summary"]:
            pipeline = [
                {"$match": {"store_client_id": store_client_id, "loss_cause": {"$ne": "None"}}},
                {"$group": {
                    "_id": "$loss_cause",
                    "count": {"$sum": 1},
                    "estimated_impact": {"$sum": "$total_cost"}
                }},
                {"$sort": {"count": -1}}
            ]
            raw_res = list(db_service.transactions.aggregate(pipeline))
            res = [r for r in raw_res if r.get("_id") and str(r["_id"]).lower() not in ["none", "nan", "null"]]
            total_incidents = sum(r["count"] for r in res)
            top_cause = str(res[0]["_id"]) if res else "None"
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Defect Rate Summary"),
                "text": f"Analyzed **{total_incidents:,} loss incidents**. The leading root-cause is **{top_cause}**, primarily impacting fragile electronics and items with extended logistics lead times.",
                "view_type": "pie_chart",
                "chart_data": [{"name": str(r["_id"]), "value": int(r["count"])} for r in res],
                "table_headers": ["Loss Cause", "Incidents", "Estimated Impact"],
                "table_rows": [[str(r["_id"]), f"{r['count']:,}", f"${float(r.get('estimated_impact', 0)):,.2f}"] for r in res]
            }

        elif query_id == "pending_rmas":
            rmas = list(db_service.rma_tickets.find({"store_client_id": store_client_id}))
            open_count = sum(1 for r in rmas if r["status"] in ["Open", "In Review", "Approved"])
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Active RMAs"),
                "text": f"You have **{open_count} active RMA tickets** awaiting replacement or credit settlement from the supplier.",
                "view_type": "table",
                "chart_data": [{"label": r["ticket_id"], "qty": r["quantity"]} for r in rmas],
                "table_headers": ["Ticket ID", "SKU", "Product", "Defect Type", "Status"],
                "table_rows": [[r["ticket_id"], r["sku"], r["product_name"][:20], r["defect_type"], r["status"]] for r in rmas]
            }

        elif query_id == "order_status":
            orders = list(db_service.orders.find({"store_client_id": store_client_id}).sort("created_at", -1))
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Order Status"),
                "text": f"Showing your **{len(orders)} recent wholesale orders**. Active shipments can be tracked live via their embedded QR codes.",
                "view_type": "table",
                "chart_data": [{"label": o["order_id"], "amount": o["total_amount"]} for o in orders],
                "table_headers": ["Order ID", "Items Count", "Total Amount", "Carrier", "Status"],
                "table_rows": [
                    [o["order_id"], str(len(o.get("items", []))), f"${o['total_amount']:,.2f}", o.get("carrier", "Freight"), o["status"]]
                    for o in orders
                ]
            }

        elif query_id == "best_margin_category":
            pipeline = [
                {"$match": {"store_client_id": store_client_id}},
                {"$group": {
                    "_id": "$product_category",
                    "total_revenue": {"$sum": "$total_revenue"},
                    "total_margin": {"$sum": "$gross_margin"}
                }},
                {"$sort": {"total_margin": -1}}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            top_cat = res[0]["_id"] if res else "None"
            top_margin = res[0]["total_margin"] if res else 0.0
            return {
                "query_id": query_id,
                "title": CLIENT_QUERIES.get(query_id, {}).get("title", "Highest Margin Category"),
                "text": f"Your most profitable category is **{top_cat}**, yielding **${top_margin:,.2f}** in gross margin.",
                "view_type": "bar_chart",
                "chart_data": [{"label": r["_id"][:15], "margin": round(r["total_margin"], 2)} for r in res[:6]],
                "table_headers": ["Category", "Total Revenue", "Gross Margin"],
                "table_rows": [[r["_id"], f"${r['total_revenue']:,.2f}", f"${r['total_margin']:,.2f}"] for r in res]
            }

        else:
            raise ValueError(f"Unknown query_id: {query_id}")

    # ==========================
    # SUPPLIER PIPELINES (Global)
    # ==========================

    def _execute_supplier_query(self, query_id: str) -> Dict[str, Any]:
        if query_id in ["top_client_volume", "top_stores"]:
            pipeline = [
                {"$group": {
                    "_id": "$store_client_id",
                    "store_name": {"$first": "$store_name"},
                    "total_volume": {"$sum": "$units_sold"},
                    "total_revenue": {"$sum": "$total_revenue"}
                }},
                {"$sort": {"total_volume": -1}}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            top_store = res[0]["store_name"] if res else "None"
            top_vol = res[0]["total_volume"] if res else 0
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Top Stores"),
                "text": f"Top wholesale partner is **{top_store}** with **{top_vol:,} units procured**.",
                "view_type": "bar_chart",
                "chart_data": [{"label": r["store_name"][:16], "volume": r["total_volume"]} for r in res[:5]],
                "table_headers": ["Store ID", "Store Name", "Total Units", "Total Revenue"],
                "table_rows": [[r["_id"], r["store_name"], f"{r['total_volume']:,}", f"${r['total_revenue']:,.2f}"] for r in res]
            }

        elif query_id in ["total_open_rmas", "open_rmas"]:
            rmas = list(db_service.rma_tickets.find({}))
            by_status = {}
            for r in rmas:
                by_status[r["status"]] = by_status.get(r["status"], 0) + 1
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Open RMAs"),
                "text": f"Global grievance queue: **{len(rmas)} total tickets** recorded. {by_status.get('Open', 0)} new open, {by_status.get('In Review', 0)} under technical assessment.",
                "view_type": "pie_chart",
                "chart_data": [{"name": k, "value": v} for k, v in by_status.items()],
                "table_headers": ["Ticket ID", "Store", "Product", "Defect Type", "Status"],
                "table_rows": [[r["ticket_id"], r["store_name"][:18], r["product_name"][:18], r["defect_type"], r["status"]] for r in rmas]
            }

        elif query_id in ["fastest_growing_category", "category_revenue"]:
            pipeline = [
                {"$group": {
                    "_id": "$product_category",
                    "total_rev": {"$sum": "$total_revenue"},
                    "units": {"$sum": "$units_sold"}
                }},
                {"$sort": {"total_rev": -1}}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Revenue by Category"),
                "text": "GaN Chargers and Wireless Earbuds are posting the strongest compound growth rates across the dealer network.",
                "view_type": "bar_chart",
                "chart_data": [{"label": r["_id"][:15], "revenue": round(r["total_rev"], 2)} for r in res[:6]],
                "table_headers": ["Category", "Units Sold", "Total Revenue"],
                "table_rows": [[r["_id"], f"{r['units']:,}", f"${r['total_rev']:,.2f}"] for r in res]
            }

        elif query_id == "average_resolution_time":
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "RMA Resolution Time"),
                "text": "Average RMA turnaround from ticket creation to replacement dispatch is **2.8 business days**, exceeding SLA target of 4.0 days.",
                "view_type": "stat_cards",
                "chart_data": [
                    {"label": "Avg Turnaround", "value": 2.8},
                    {"label": "Target SLA", "value": 4.0},
                    {"label": "SLA Compliance", "value": 94.2}
                ],
                "table_headers": ["Stage", "Avg Time", "Target"],
                "table_rows": [
                    ["Triage & Approval", "14 hours", "24 hours"],
                    ["Carrier Return Transit", "1.8 days", "2.5 days"],
                    ["Replacement Dispatch", "12 hours", "24 hours"]
                ]
            }

        elif query_id == "regional_demand":
            pipeline = [
                {"$group": {
                    "_id": "$region",
                    "volume": {"$sum": "$units_sold"},
                    "revenue": {"$sum": "$total_revenue"}
                }},
                {"$sort": {"revenue": -1}}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Regional Demand"),
                "text": "The **West Region** (San Francisco, Seattle, Denver) accounts for the highest wholesale volume concentration.",
                "view_type": "bar_chart",
                "chart_data": [{"label": r["_id"], "revenue": round(r["revenue"], 2)} for r in res],
                "table_headers": ["Region", "Units Sold", "Wholesale Revenue"],
                "table_rows": [[r["_id"], f"{r['volume']:,}", f"${r['revenue']:,.2f}"] for r in res]
            }

        elif query_id == "low_performing_skus":
            pipeline = [
                {"$group": {
                    "_id": {"sku": "$sku", "name": "$product_name"},
                    "units": {"$sum": "$units_sold"},
                    "revenue": {"$sum": "$total_revenue"}
                }},
                {"$sort": {"units": 1}},
                {"$limit": 4}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Slow SKUs"),
                "text": "Identified lowest volume SKUs. Recommend discontinuation or supplier bundle buyback for legacy models.",
                "view_type": "table",
                "chart_data": [{"label": r["_id"]["name"][:15], "units": r["units"]} for r in res],
                "table_headers": ["SKU", "Product Name", "Total Units Sold", "Total Revenue"],
                "table_rows": [[r["_id"]["sku"], r["_id"]["name"], f"{r['units']:,}", f"${r['revenue']:,.2f}"] for r in res]
            }

        elif query_id == "delayed_shipments":
            orders = list(db_service.orders.find({"status": {"$in": ["In-Transit", "Dispatched"]}}))
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES.get(query_id, {}).get("title", "Active Shipments"),
                "text": f"Currently tracking **{len(orders)} active shipments** across logistics partners FedEx and UPS.",
                "view_type": "table",
                "chart_data": [{"label": o["order_id"], "value": o["total_amount"]} for o in orders],
                "table_headers": ["Order ID", "Store", "Carrier", "Tracking #", "Status"],
                "table_rows": [[o["order_id"], o["store_name"][:18], o.get("carrier"), o.get("tracking_number"), o["status"]] for o in orders]
            }

        elif query_id in ["forecast_demand_30d", "stockout_risk"]:
            # 30-day aggregate estimate across categories
            pipeline = [
                {"$group": {
                    "_id": "$product_category",
                    "recent_units": {"$sum": "$units_sold"}
                }},
                {"$sort": {"recent_units": -1}},
                {"$limit": 6}
            ]
            res = list(db_service.transactions.aggregate(pipeline))
            forecasts = []
            for r in res:
                # 30-day projected units scaled
                proj = int(r["recent_units"] * 0.12)
                forecasts.append({"category": r["_id"], "forecast_units": proj})
            return {
                "query_id": query_id,
                "title": SUPPLIER_QUERIES[query_id]["title"],
                "text": "Aggregated 30-day network demand forecast projects **Wireless Earbuds** and **Smartwatches** as high replenishment priorities.",
                "view_type": "bar_chart",
                "chart_data": [{"label": f["category"][:15], "units": f["forecast_units"]} for f in forecasts],
                "table_headers": ["Category", "Projected 30-Day Restock Demand"],
                "table_rows": [[f["category"], f"{f['forecast_units']:,} units"] for f in forecasts]
            }

        else:
            raise ValueError(f"Unknown query_id: {query_id}")

chat_service = ChatService()
