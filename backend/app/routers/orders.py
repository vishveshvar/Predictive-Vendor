"""
Orders, Logistics, and QR Tracking Router
Manages wholesale order creation, timeline milestones, printable QR label sheets,
and public-facing supply chain verification.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.models.schemas import CreateOrderRequest, UpdateOrderStatusRequest
from app.core.security import require_role, get_current_user
from app.services.db import db_service
from app.services.qr_service import generate_order_qr, get_public_tracking_info
from ml_engine.generate_dataset import generate_hash
from app.core.audit import log_audit

router = APIRouter(tags=["Orders & Logistics"])

@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(
    payload: CreateOrderRequest,
    current_user: Dict[str, Any] = Depends(require_role(["supplier"]))
):
    store = db_service.stores.find_one({"store_client_id": payload.store_client_id})
    if not store:
        raise HTTPException(status_code=404, detail={"code": "STORE_NOT_FOUND", "message": f"Store {payload.store_client_id} does not exist"})

    order_count = db_service.orders.count_documents({})
    order_id = f"ORD-{7100 + order_count}"
    now_iso = datetime.now(timezone.utc).isoformat()
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Cryptographic tracking hash
    tracking_hash = generate_hash(order_id, payload.store_client_id, date_str)

    # Compute total
    total_amount = round(sum(item.quantity * item.unit_cost for item in payload.items), 2)

    order_doc = {
        "order_id": order_id,
        "store_client_id": payload.store_client_id,
        "store_name": store["name"],
        "items": [item.model_dump() for item in payload.items],
        "total_amount": total_amount,
        "status": "Manufactured",
        "qr_tracking_hash": tracking_hash,
        "carrier": payload.carrier or "FedEx Freight Express",
        "tracking_number": f"FX-{order_id.replace('ORD-', '')}8921",
        "origin": "Wholesale Central Hub, Chicago, IL",
        "destination": payload.destination or f"{store['city']}, {store.get('region', '')}",
        "timeline": [
            {
                "status": "Manufactured",
                "timestamp": now_iso,
                "location": "Chicago Distribution Center",
                "actor": current_user.get("display_name", "Assembly Ops")
            }
        ],
        "created_at": now_iso
    }

    db_service.orders.insert_one(order_doc)
    order_doc.pop("_id", None)

    log_audit(current_user["uid"], "supplier", "CREATE_ORDER", f"orders/{order_id}", details={"amount": total_amount})

    return {
        "message": "Wholesale order successfully created",
        "order": order_doc,
        "qr": generate_order_qr(order_id, tracking_hash)
    }

@router.post("/orders/dispatch", status_code=status.HTTP_201_CREATED)
def dispatch_order(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(require_role(["supplier", "client"]))
):
    """
    Dispatches a wholesale shipment order.
    Generates a cryptographic HMAC hash, creates a Dispatched order, and saves to MongoDB orders.
    """
    store_id = payload.get("store_client_id", "STORE-001")
    store = db_service.stores.find_one({"store_client_id": store_id})
    store_name = store["name"] if store else f"Retail Store ({store_id})"
    city = store["city"] if store else "New York"
    region = store.get("region", "East") if store else "Metro"

    sku = payload.get("sku", "SKU-WAT-01")
    quantity = int(payload.get("quantity", 100))
    carrier = payload.get("carrier", "FedEx Priority Express")

    product = db_service.products.find_one({"sku": sku})
    prod_name = product["name"] if product else sku
    unit_cost = float(product["unit_cost"]) if product else 45.0
    total_amount = round(quantity * unit_cost, 2)

    order_count = db_service.orders.count_documents({})
    order_id = f"ORD-{7100 + order_count}"
    now_iso = datetime.now(timezone.utc).isoformat()
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Generate 16-character cryptographic hash
    tracking_hash = generate_hash(order_id, store_id, date_str)
    destination = payload.get("destination") or f"{city}, {region}"

    order_doc = {
        "order_id": order_id,
        "store_client_id": store_id,
        "store_name": store_name,
        "sku": sku,
        "items": [
            {
                "sku": sku,
                "name": prod_name,
                "quantity": quantity,
                "unit_cost": unit_cost,
                "total": total_amount
            }
        ],
        "total_amount": total_amount,
        "status": "Dispatched",
        "tracking_hash": tracking_hash,
        "qr_tracking_hash": tracking_hash,
        "carrier": carrier,
        "tracking_number": f"FX-{order_id.replace('ORD-', '')}8921",
        "origin": "Wholesale Central Hub, Chicago, IL",
        "destination": destination,
        "timeline": [
            {
                "status": "Manufactured",
                "timestamp": now_iso,
                "location": "Chicago Distribution Center",
                "actor": "Assembly Ops"
            },
            {
                "status": "Dispatched",
                "timestamp": now_iso,
                "location": "Chicago Outbound Bay 4",
                "actor": current_user.get("display_name", "Wholesale Dispatcher")
            }
        ],
        "created_at": now_iso
    }

    db_service.orders.insert_one(order_doc)
    order_doc.pop("_id", None)

    log_audit(current_user["uid"], current_user.get("role", "supplier"), "DISPATCH_ORDER", f"orders/{order_id}", details={"hash": tracking_hash, "amount": total_amount})

    return {
        "message": f"Order {order_id} dispatched successfully",
        "order": order_doc,
        "tracking_hash": tracking_hash,
        "qr": generate_order_qr(order_id, tracking_hash)
    }

@router.get("/orders")
def list_orders(
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    role = current_user.get("role")
    if role == "client":
        store_id = current_user.get("store_client_id")
        orders = list(db_service.orders.find({"store_client_id": store_id}, {"_id": 0}).sort("created_at", -1))
    else:
        orders = list(db_service.orders.find({}, {"_id": 0}).sort("created_at", -1))

    for o in orders:
        if not o.get("tracking_hash") and o.get("qr_tracking_hash"):
            o["tracking_hash"] = o["qr_tracking_hash"]

    return {
        "orders": orders,
        "count": len(orders)
    }

@router.get("/orders/{order_id}")
def get_order(
    order_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["client", "supplier"]))
):
    order = db_service.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Order not found"})

    # Client isolation check
    if current_user["role"] == "client" and order.get("store_client_id") != current_user.get("store_client_id"):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Access to another client's order is strictly forbidden"})

    if not order.get("tracking_hash") and order.get("qr_tracking_hash"):
        order["tracking_hash"] = order["qr_tracking_hash"]

    return order

@router.get("/orders/{order_id}/qr")
def get_order_qr(
    order_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["supplier", "client"]))
):
    order = db_service.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Order not found"})

    if current_user["role"] == "client" and order.get("store_client_id") != current_user.get("store_client_id"):
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Forbidden"})

    h = order.get("tracking_hash") or order.get("qr_tracking_hash")
    return generate_order_qr(order_id, h)

@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    payload: UpdateOrderStatusRequest,
    current_user: Dict[str, Any] = Depends(require_role(["supplier"]))
):
    order = db_service.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Order not found"})

    now_iso = datetime.now(timezone.utc).isoformat()
    new_step = {
        "status": payload.status.value,
        "timestamp": now_iso,
        "location": payload.location,
        "actor": payload.actor or current_user.get("display_name", "Logistics Ops"),
        "notes": payload.notes
    }

    db_service.orders.update_one(
        {"order_id": order_id},
        {
            "$set": {"status": payload.status.value},
            "$push": {"timeline": new_step}
        }
    )

    # In-app notification for client
    recipient = f"usr_{order['store_client_id'].lower().replace('-', '_')}"
    db_service.notifications.insert_one({
        "recipient_uid": recipient,
        "type": "ORDER_STATUS_UPDATE",
        "title": f"Shipment Status: {payload.status.value} ({order_id})",
        "body": f"Order {order_id} is now [{payload.status.value}] at {payload.location}.",
        "read": False,
        "created_at": now_iso
    })

    log_audit(current_user["uid"], "supplier", "UPDATE_ORDER_STATUS", f"orders/{order_id}", details={"new_status": payload.status.value})

    return {
        "message": f"Order {order_id} status updated to {payload.status.value}",
        "status": payload.status.value,
        "timeline_step": new_step
    }

@router.get("/track/{hash_code}")
@router.get("/orders/track/{hash_code}")
def track_order_public(hash_code: str):
    """
    Public QR Tracking Endpoint.
    Directly queries MongoDB: db.orders.find_one({"tracking_hash": hash}).
    If found, returns the order details and renders shipment timeline.
    """
    h_clean = hash_code.strip()
    order = db_service.orders.find_one({
        "$or": [
            {"tracking_hash": h_clean},
            {"tracking_hash": h_clean.upper()},
            {"qr_tracking_hash": h_clean},
            {"qr_tracking_hash": h_clean.upper()}
        ]
    }, {"_id": 0})

    if not order:
        raise HTTPException(
            status_code=404,
            detail={"code": "INVALID_HASH", "message": f"No active shipment found matching tracking hash {hash_code}"}
        )

    # Count items
    item_count = sum(item.get("quantity", 0) for item in order.get("items", []))
    if item_count == 0 and "quantity" in order:
        item_count = int(order["quantity"])

    timeline = order.get("timeline", [])
    if not timeline:
        timeline = [
            {
                "status": order.get("status", "Dispatched"),
                "timestamp": order.get("created_at", datetime.now(timezone.utc).isoformat()),
                "location": order.get("origin", "Wholesale Central Hub, Chicago, IL"),
                "actor": "Logistics Dispatcher"
            }
        ]

    sanitized_items = [
        {"sku": it.get("sku"), "name": it.get("name"), "quantity": it.get("quantity", 1)}
        for it in order.get("items", [])
    ]

    return {
        "order_id": order.get("order_id"),
        "status": order.get("status", "Dispatched"),
        "tracking_hash": order.get("tracking_hash") or order.get("qr_tracking_hash"),
        "qr_tracking_hash": order.get("qr_tracking_hash") or order.get("tracking_hash"),
        "carrier": order.get("carrier", "FedEx Freight Express"),
        "tracking_number": order.get("tracking_number", "FX-884920194"),
        "origin": order.get("origin", "Wholesale Central Hub, Chicago, IL"),
        "destination": order.get("destination", "Regional Retail Facility"),
        "store_client_id": order.get("store_client_id"),
        "items": sanitized_items,
        "item_count": item_count,
        "timeline": timeline,
        "last_updated": timeline[-1].get("timestamp") if timeline else order.get("created_at")
    }
