"""
Comprehensive Database Seeding Script
Populates MongoDB / mongomock with:
- users (client1, client2, supplier)
- stores (8 retail locations)
- products (22 electronics SKUs)
- transactions (from generated dataset)
- inventory_snapshots (current on-hand stock)
- orders (with QR hashes and audit timelines)
- rma_tickets (defects, history, statuses)
- notifications (stockout alerts and order milestones)
- audit_logs (initial trace)
Exports a JSON snapshot for zero-delay in-memory hydration.
"""

import sys
import os
import json
import datetime
from pathlib import Path
import pandas as pd

# Setup sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.services.db import db_service
from ml_engine.generate_dataset import STORES, PRODUCTS, generate_hash

DEMO_USERS = [
    {
        "uid": "usr_client_001",
        "email": "client1@store.com",
        "role": "client",
        "store_client_id": "STORE-001",
        "display_name": "Marcus Vance",
        "store_name": "Apex Electronics Metro Flagship",
        "created_at": "2024-10-01T00:00:00Z"
    },
    {
        "uid": "usr_client_002",
        "email": "client2@store.com",
        "role": "client",
        "store_client_id": "STORE-002",
        "display_name": "Elena Rostova",
        "store_name": "TechHaven Downtown Hub",
        "created_at": "2024-10-01T00:00:00Z"
    },
    {
        "uid": "usr_supplier_001",
        "email": "supplier@vendor.com",
        "role": "supplier",
        "store_client_id": None,
        "display_name": "David Sterling",
        "store_name": "Global Wholesale Distribution",
        "created_at": "2024-10-01T00:00:00Z"
    }
]

def seed_database():
    print(f"[{datetime.datetime.now().isoformat()}] Starting Database Seeding on engine: {db_service.engine_name}")

    # 1. Seed Users
    db_service.users.delete_many({})
    db_service.users.insert_many(DEMO_USERS)
    print(f"Seeded {len(DEMO_USERS)} users.")

    # 2. Seed Stores
    stores_data = []
    for s in STORES:
        stores_data.append({
            "store_client_id": s["store_client_id"],
            "name": s["name"],
            "city": s["city"],
            "region": s["region"],
            "lat": s["lat"],
            "lng": s["lng"],
            "multiplier": s["multiplier"],
            "owner_email": s["owner_email"],
            "created_at": "2024-10-01T00:00:00Z"
        })
    db_service.stores.delete_many({})
    db_service.stores.insert_many(stores_data)
    print(f"Seeded {len(stores_data)} stores.")

    # 3. Seed Products
    products_data = []
    for p in PRODUCTS:
        reorder_point = int(p["lead_time_days"] * p["base_velocity"] * 1.5)
        products_data.append({
            "sku": p["sku"],
            "product_category": p["product_category"],
            "name": p["name"],
            "brand": p["brand"],
            "unit_cost": p["unit_cost"],
            "unit_price": p["unit_price"],
            "supplier_lead_time_days": p["lead_time_days"],
            "reorder_point": reorder_point,
            "base_velocity": p["base_velocity"],
            "is_deadstock": p.get("is_deadstock", False),
            "created_at": "2024-10-01T00:00:00Z"
        })
    db_service.products.delete_many({})
    db_service.products.insert_many(products_data)
    print(f"Seeded {len(products_data)} products.")

    # 4. Seed Transactions
    csv_path = settings.DATASET_PATH
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset CSV not found at: {csv_path}. Run generate_dataset.py first.")

    print(f"Reading dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    txn_records = df.to_dict(orient="records")
    db_service.transactions.delete_many({})
    
    # Batch insert to handle 100k+ documents efficiently
    batch_size = 10000
    for i in range(0, len(txn_records), batch_size):
        db_service.transactions.insert_many(txn_records[i:i+batch_size])
    print(f"Seeded {len(txn_records):,} transactions.")

    # 5. Seed Inventory Snapshots (Latest stock from transactions)
    latest_date = df["date"].max()
    latest_df = df[df["date"] == latest_date]
    snapshots = []
    for _, row in latest_df.iterrows():
        snapshots.append({
            "store_client_id": row["store_client_id"],
            "sku": row["sku"],
            "date": row["date"],
            "stock_level": int(row["current_stock_level"]),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        })
    db_service.inventory_snapshots.delete_many({})
    if snapshots:
        db_service.inventory_snapshots.insert_many(snapshots)
    print(f"Seeded {len(snapshots)} current inventory snapshots.")

    # 6. Seed Sample Orders with realistic timelines and QR tracking hashes
    orders_data = [
        {
            "order_id": "ORD-7001",
            "store_client_id": "STORE-001",
            "store_name": "Apex Electronics Metro Flagship",
            "items": [
                {"sku": "SKU-WAT-01", "name": "Apex Pulse Pro Watch", "quantity": 40, "unit_cost": 120.0, "total": 4800.0},
                {"sku": "SKU-EAR-01", "name": "AeroBuds ANC Ultra", "quantity": 80, "unit_cost": 55.0, "total": 4400.0}
            ],
            "total_amount": 9200.0,
            "status": "In-Transit",
            "qr_tracking_hash": generate_hash("ORD-7001", "STORE-001", "2026-09-28"),
            "carrier": "FedEx Freight Express",
            "tracking_number": "FX-884920194",
            "origin": "Wholesale Central Hub, Chicago, IL",
            "destination": "San Francisco, CA",
            "timeline": [
                {"status": "Manufactured", "timestamp": "2026-09-28T09:00:00Z", "location": "Chicago Distribution Center", "actor": "Assembly Ops"},
                {"status": "Dispatched", "timestamp": "2026-09-29T14:30:00Z", "location": "Chicago Logistics Terminal", "actor": "Logistics Dispatcher"},
                {"status": "In-Transit", "timestamp": "2026-09-30T18:15:00Z", "location": "Omaha Hub Sorting Facility", "actor": "Carrier Scan"}
            ],
            "created_at": "2026-09-28T08:30:00Z"
        },
        {
            "order_id": "ORD-7002",
            "store_client_id": "STORE-002",
            "store_name": "TechHaven Downtown Hub",
            "items": [
                {"sku": "SKU-GAN-01", "name": "HyperVolt 100W GaN III", "quantity": 100, "unit_cost": 22.0, "total": 2200.0},
                {"sku": "SKU-KEY-01", "name": "TactilePro RGB 75%", "quantity": 30, "unit_cost": 65.0, "total": 1950.0}
            ],
            "total_amount": 4150.0,
            "status": "Dispatched",
            "qr_tracking_hash": generate_hash("ORD-7002", "STORE-002", "2026-09-29"),
            "carrier": "UPS Ground Commercial",
            "tracking_number": "1Z999AA10123456784",
            "origin": "Wholesale Central Hub, Chicago, IL",
            "destination": "New York, NY",
            "timeline": [
                {"status": "Manufactured", "timestamp": "2026-09-29T10:00:00Z", "location": "Chicago Distribution Center", "actor": "Assembly Ops"},
                {"status": "Dispatched", "timestamp": "2026-09-30T09:45:00Z", "location": "Chicago Outbound Bay 4", "actor": "Logistics Dispatcher"}
            ],
            "created_at": "2026-09-29T09:00:00Z"
        },
        {
            "order_id": "ORD-7003",
            "store_client_id": "STORE-001",
            "store_name": "Apex Electronics Metro Flagship",
            "items": [
                {"sku": "SKU-TAB-01", "name": "TabLite 10.5 High-Res Display", "quantity": 25, "unit_cost": 160.0, "total": 4000.0}
            ],
            "total_amount": 4000.0,
            "status": "Delivered",
            "qr_tracking_hash": generate_hash("ORD-7003", "STORE-001", "2026-09-20"),
            "carrier": "FedEx Freight Express",
            "tracking_number": "FX-884918273",
            "origin": "Wholesale Central Hub, Chicago, IL",
            "destination": "San Francisco, CA",
            "timeline": [
                {"status": "Manufactured", "timestamp": "2026-09-20T08:00:00Z", "location": "Chicago Distribution Center", "actor": "Assembly Ops"},
                {"status": "Dispatched", "timestamp": "2026-09-21T11:00:00Z", "location": "Chicago Logistics Terminal", "actor": "Logistics Dispatcher"},
                {"status": "In-Transit", "timestamp": "2026-09-23T16:00:00Z", "location": "Salt Lake City Transfer Hub", "actor": "Carrier Scan"},
                {"status": "Delivered", "timestamp": "2026-09-25T13:40:00Z", "location": "San Francisco Flagship Receiving Dock", "actor": "Marcus Vance"}
            ],
            "created_at": "2026-09-20T07:30:00Z"
        },
        {
            "order_id": "ORD-7004",
            "store_client_id": "STORE-003",
            "store_name": "Silicon Gateway Retail",
            "items": [
                {"sku": "SKU-MOU-01", "name": "ViperSpeed Ultralight 48g", "quantity": 50, "unit_cost": 32.0, "total": 1600.0}
            ],
            "total_amount": 1600.0,
            "status": "Manufactured",
            "qr_tracking_hash": generate_hash("ORD-7004", "STORE-003", "2026-10-01"),
            "carrier": "DHL Express Cargo",
            "tracking_number": "DHL-440291039",
            "origin": "Wholesale Central Hub, Chicago, IL",
            "destination": "Austin, TX",
            "timeline": [
                {"status": "Manufactured", "timestamp": "2026-10-01T11:00:00Z", "location": "Chicago Distribution Center", "actor": "Assembly Ops"}
            ],
            "created_at": "2026-10-01T10:00:00Z"
        }
    ]
    db_service.orders.delete_many({})
    db_service.orders.insert_many(orders_data)
    print(f"Seeded {len(orders_data)} orders with tracking hashes.")

    # 7. Seed RMA Tickets
    rma_data = [
        {
            "ticket_id": "RMA-9001",
            "store_client_id": "STORE-001",
            "store_name": "Apex Electronics Metro Flagship",
            "order_id": "ORD-7003",
            "sku": "SKU-TAB-01",
            "product_name": "TabLite 10.5 High-Res Display",
            "quantity": 2,
            "defect_type": "Transit Damage",
            "description": "Screen cracked during transit inside original master carton packaging. Unsalable.",
            "status": "In Review",
            "history": [
                {"status": "Open", "timestamp": "2026-09-26T10:15:00Z", "actor": "Marcus Vance", "comment": "Ticket created with damage photos."},
                {"status": "In Review", "timestamp": "2026-09-27T08:30:00Z", "actor": "David Sterling", "comment": "Carrier insurance claim filed with FedEx Freight."}
            ],
            "created_at": "2026-09-26T10:15:00Z"
        },
        {
            "ticket_id": "RMA-9002",
            "store_client_id": "STORE-002",
            "store_name": "TechHaven Downtown Hub",
            "order_id": "ORD-7002",
            "sku": "SKU-KEY-01",
            "product_name": "TactilePro RGB 75%",
            "quantity": 1,
            "defect_type": "Manufacturer Defect",
            "description": "Spacebar stabilizer binding and RGB LED row 3 unresponsive on unit #28.",
            "status": "Open",
            "history": [
                {"status": "Open", "timestamp": "2026-09-29T16:00:00Z", "actor": "Elena Rostova", "comment": "Customer return tested and verified defective."}
            ],
            "created_at": "2026-09-29T16:00:00Z"
        },
        {
            "ticket_id": "RMA-9003",
            "store_client_id": "STORE-001",
            "store_name": "Apex Electronics Metro Flagship",
            "order_id": "ORD-6890",
            "sku": "SKU-WAT-01",
            "product_name": "Apex Pulse Pro Watch",
            "quantity": 3,
            "defect_type": "Dead-on-Arrival",
            "description": "Battery fails to power on or accept magnetic dock charge.",
            "status": "Approved",
            "history": [
                {"status": "Open", "timestamp": "2026-09-15T09:00:00Z", "actor": "Marcus Vance", "comment": "Batch DOA reported."},
                {"status": "In Review", "timestamp": "2026-09-16T11:00:00Z", "actor": "David Sterling", "comment": "Supplier diagnostic request authorized."},
                {"status": "Approved", "timestamp": "2026-09-17T14:20:00Z", "actor": "David Sterling", "comment": "Credit memo $360.00 approved."}
            ],
            "created_at": "2026-09-15T09:00:00Z"
        },
        {
            "ticket_id": "RMA-9004",
            "store_client_id": "STORE-003",
            "store_name": "Silicon Gateway Retail",
            "order_id": "ORD-6810",
            "sku": "SKU-EAR-01",
            "product_name": "AeroBuds ANC Ultra",
            "quantity": 5,
            "defect_type": "Manufacturer Defect",
            "description": "Left earbud high pitch squeal firmware defect.",
            "status": "Replaced",
            "history": [
                {"status": "Open", "timestamp": "2026-09-10T08:00:00Z", "actor": "Austin Store Admin", "comment": "Created ticket."},
                {"status": "Approved", "timestamp": "2026-09-12T10:00:00Z", "actor": "David Sterling", "comment": "Batch replacement authorized."},
                {"status": "Replaced", "timestamp": "2026-09-18T16:00:00Z", "actor": "David Sterling", "comment": "Replacement shipment tracking #FX-88491039 dispatched."}
            ],
            "created_at": "2026-09-10T08:00:00Z"
        }
    ]
    db_service.rma_tickets.delete_many({})
    db_service.rma_tickets.insert_many(rma_data)
    print(f"Seeded {len(rma_data)} RMA tickets across Kanban stages.")

    # 8. Seed Notifications
    notifications_data = [
        {
            "recipient_uid": "usr_client_001",
            "type": "STOCKOUT_WARNING",
            "title": "Stockout Imminent: HyperVolt 100W GaN III",
            "body": "Projected stockout in 4.2 days based on 7-day velocity. Recommended restock: 65 units.",
            "read": False,
            "created_at": "2026-10-01T08:00:00Z"
        },
        {
            "recipient_uid": "usr_client_001",
            "type": "ORDER_UPDATE",
            "title": "Shipment In-Transit (ORD-7001)",
            "body": "Your order of 120 units has passed the Omaha transfer terminal and is on schedule.",
            "read": True,
            "created_at": "2026-09-30T18:20:00Z"
        },
        {
            "recipient_uid": "usr_supplier_001",
            "type": "RMA_SUBMITTED",
            "title": "New Grievance Ticket Submitted",
            "body": "TechHaven Downtown filed ticket RMA-9002 for TactilePro RGB Keyboard.",
            "read": False,
            "created_at": "2026-09-29T16:05:00Z"
        }
    ]
    db_service.notifications.delete_many({})
    db_service.notifications.insert_many(notifications_data)
    print(f"Seeded {len(notifications_data)} notifications.")

    # 9. Seed Audit Logs
    audit_data = [
        {
            "actor_uid": "system_bootstrap",
            "role": "system",
            "action": "DATABASE_INITIALIZE",
            "resource": "all_collections",
            "ip": "127.0.0.1",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        },
        {
            "actor_uid": "usr_supplier_001",
            "role": "supplier",
            "action": "ORDER_CREATE",
            "resource": "orders/ORD-7001",
            "ip": "192.168.1.104",
            "timestamp": "2026-09-28T08:30:00Z"
        }
    ]
    db_service.audit_logs.delete_many({})
    db_service.audit_logs.insert_many(audit_data)
    print(f"Seeded {len(audit_data)} audit log entries.")

    # 10. Dump Snapshot for ultra-fast mongomock startup
    snapshot_path = settings.FALLBACK_DB_PATH
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Store recent 60 days of transactions in snapshot for instant hydration (avoids 6s CSV parse)
    recent_date_threshold = (pd.to_datetime(latest_date) - pd.Timedelta(days=60)).strftime("%Y-%m-%d")
    recent_txns = list(db_service.transactions.find({"date": {"$gte": recent_date_threshold}}, {"_id": 0}))

    snapshot = {
        "users": list(db_service.users.find({}, {"_id": 0})),
        "stores": list(db_service.stores.find({}, {"_id": 0})),
        "products": list(db_service.products.find({}, {"_id": 0})),
        "inventory_snapshots": list(db_service.inventory_snapshots.find({}, {"_id": 0})),
        "orders": list(db_service.orders.find({}, {"_id": 0})),
        "rma_tickets": list(db_service.rma_tickets.find({}, {"_id": 0})),
        "notifications": list(db_service.notifications.find({}, {"_id": 0})),
        "audit_logs": list(db_service.audit_logs.find({}, {"_id": 0})),
        "transactions": recent_txns
    }
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)
    print(f"Database snapshot with {len(recent_txns):,} recent transactions written to: {snapshot_path}")

    print("=" * 60)
    print("       DATABASE SEEDING COMPLETED SUCCESSFULLY       ")
    print("=" * 60)

if __name__ == "__main__":
    seed_database()
