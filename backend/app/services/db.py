"""
Database Connection & Abstraction Service
Connects to MongoDB Atlas / Local MongoDB via PyMongo.
If MongoDB is unreachable, activates zero-configuration mongomock fallback.
Automatically hydrates in-memory instance from data/db_snapshot.json and CSV.
Ensures identical collection interfaces, index initialization, and aggregation execution.
"""

import json
import logging
from typing import Any, Dict
from pathlib import Path
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import mongomock
import pandas as pd

from app.core.config import settings

logger = logging.getLogger("app.db")

class DatabaseService:
    def __init__(self):
        self._client = None
        self._db = None
        self._is_fallback = False
        self._engine_name = "Uninitialized"
        self._connect()

    def _connect(self):
        mongo_uri = settings.MONGODB_URI
        try:
            logger.info(f"Attempting MongoDB connection to: {mongo_uri}")
            client_kwargs = {
                "serverSelectionTimeoutMS": 5000,
                "connectTimeoutMS": 5000
            }
            if "mongodb+srv" in mongo_uri or "ssl=true" in mongo_uri.lower() or "tls=true" in mongo_uri.lower() or "mongodb.net" in mongo_uri:
                try:
                    import certifi
                    client_kwargs["tlsCAFile"] = certifi.where()
                except Exception as cert_err:
                    logger.debug(f"certifi not available: {cert_err}")

            client = pymongo.MongoClient(mongo_uri, **client_kwargs)
            # Force server check
            client.admin.command("ping")
            self._client = client
            self._db = client[settings.MONGODB_DB_NAME]
            self._is_fallback = False
            self._engine_name = "MongoDB Atlas / Network Cluster"
            logger.info("Successfully connected to live MongoDB instance.")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as exc:
            if settings.ENVIRONMENT == "production" and not settings.DEMO_MODE:
                logger.error(
                    f"MongoDB connection failed in production ({exc}). "
                    "Demonstration fallback is disabled (DEMO_MODE=false). Halting to prevent silent data loss."
                )
                raise RuntimeError(
                    f"Production MongoDB connection failed: {exc}. "
                    "To explicitly enable isolated demonstration mode, set DEMO_MODE=true."
                )

            logger.warning(
                f"MongoDB connection failed ({exc}). "
                "Activating Isolated Demonstration Mode (mongomock fallback) in accordance with Section 14."
            )
            self._client = mongomock.MongoClient()
            self._db = self._client[settings.MONGODB_DB_NAME]
            self._is_fallback = True
            self._engine_name = "Isolated Demonstration Mode (mongomock fallback)"

        self._ensure_indexes()
        self._auto_hydrate_fallback()

    def _ensure_indexes(self):
        try:
            self._db.users.create_index("uid", unique=True)
            self._db.users.create_index("store_client_id")
            self._db.stores.create_index("store_client_id", unique=True)
            self._db.products.create_index("sku", unique=True)
            self._db.products.create_index("product_category")
            self._db.transactions.create_index([("store_client_id", pymongo.ASCENDING), ("date", pymongo.ASCENDING)])
            self._db.transactions.create_index("product_category")
            self._db.transactions.create_index("qr_tracking_hash")
            self._db.inventory_snapshots.create_index([("store_client_id", 1), ("sku", 1)])
            self._db.orders.create_index("order_id", unique=True)
            self._db.orders.create_index("store_client_id")
            self._db.orders.create_index("qr_tracking_hash")
            self._db.rma_tickets.create_index("ticket_id", unique=True)
            self._db.rma_tickets.create_index("store_client_id")
            self._db.notifications.create_index("recipient_uid")
            self._db.audit_logs.create_index("timestamp")
        except Exception as e:
            logger.warning(f"Index creation notice: {e}")

    def _auto_hydrate_fallback(self):
        """If collections are empty, hydrate from snapshot and dataset CSV."""
        if self._db.users.count_documents({}) == 0:
            snapshot_path = settings.FALLBACK_DB_PATH
            if snapshot_path.exists():
                try:
                    with open(snapshot_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    for col_name, docs in data.items():
                        if docs and self._db[col_name].count_documents({}) == 0:
                            self._db[col_name].insert_many(docs)
                    logger.info(f"Hydrated collections from {snapshot_path}")
                except Exception as e:
                    logger.error(f"Failed to hydrate snapshot: {e}")

        # Ensure sample tracking hash exists for verified demo tracking
        if not self._db.orders.find_one({"$or": [{"tracking_hash": "FD997AA5485839BD"}, {"qr_tracking_hash": "FD997AA5485839BD"}]}):
            sample_order = {
                "order_id": "ORD-7002",
                "store_client_id": "STORE-002",
                "store_name": "TechHaven Downtown Hub",
                "items": [
                    {"sku": "SKU-GAN-01", "name": "HyperVolt 100W GaN III", "quantity": 100, "unit_cost": 22.0, "total": 2200.0},
                    {"sku": "SKU-KEY-01", "name": "TactilePro RGB 75%", "quantity": 30, "unit_cost": 65.0, "total": 1950.0}
                ],
                "total_amount": 4150.0,
                "status": "Dispatched",
                "tracking_hash": "FD997AA5485839BD",
                "qr_tracking_hash": "FD997AA5485839BD",
                "carrier": "UPS Ground Commercial",
                "tracking_number": "1Z999AA10123456784",
                "origin": "Wholesale Central Hub, Chicago, IL",
                "destination": "New York, NY",
                "timeline": [
                    {"status": "Manufactured", "timestamp": "2026-09-29T10:00:00Z", "location": "Chicago Distribution Center", "actor": "Assembly Ops"},
                    {"status": "Dispatched", "timestamp": "2026-09-30T09:45:00Z", "location": "Chicago Outbound Bay 4", "actor": "Logistics Dispatcher"}
                ],
                "created_at": "2026-09-29T09:00:00Z"
            }
            self._db.orders.update_one({"order_id": "ORD-7002"}, {"$set": sample_order}, upsert=True)

        # If transactions still empty and no snapshot transactions, load from CSV
        if self._db.transactions.count_documents({}) == 0:
            csv_path = settings.DATASET_PATH
            if csv_path.exists():
                try:
                    df = pd.read_csv(csv_path)
                    # Load the most recent 12,000 transactions for lightning-fast memory operations
                    recent_df = df.tail(15000)
                    records = recent_df.to_dict(orient="records")
                    self._db.transactions.insert_many(records)
                    logger.info(f"Hydrated {len(records):,} transactions from {csv_path}")
                except Exception as e:
                    logger.error(f"Failed to hydrate transactions: {e}")

    @property
    def db(self):
        if self._db is None:
            self._connect()
        return self._db

    @property
    def is_fallback(self) -> bool:
        return self._is_fallback

    @property
    def engine_name(self) -> str:
        return self._engine_name

    def get_collection(self, name: str):
        return self.db[name]

    @property
    def users(self): return self.db.users
    @property
    def stores(self): return self.db.stores
    @property
    def products(self): return self.db.products
    @property
    def transactions(self): return self.db.transactions
    @property
    def inventory_snapshots(self): return self.db.inventory_snapshots
    @property
    def orders(self): return self.db.orders
    @property
    def rma_tickets(self): return self.db.rma_tickets
    @property
    def predictions(self): return self.db.predictions
    @property
    def notifications(self): return self.db.notifications
    @property
    def audit_logs(self): return self.db.audit_logs
    @property
    def purchase_orders(self): return self.db.purchase_orders

db_service = DatabaseService()
