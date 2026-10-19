"""
Automated Background Scheduler
Evaluates inventory projections periodically.
Triggers stockout warnings (< 7 days) and writes to audit logs.
Uses asyncio / background loops compatible with FastAPI lifespan.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.services.db import db_service
from app.services.ml_service import ml_service
from app.services.email_service import send_stockout_alert

logger = logging.getLogger("app.scheduler")

class BackgroundScheduler:
    def __init__(self):
        self._running = False
        self._task = None

    async def start(self):
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Background restock and inventory alert worker started.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Background alert worker stopped.")

    async def _run_loop(self):
        # Initial delay before first evaluation
        await asyncio.sleep(60)
        while self._running:
            try:
                await asyncio.to_thread(self.evaluate_stockouts)
            except Exception as e:
                logger.error(f"Error in background scheduler cycle: {e}")
            # Run every 60 minutes
            await asyncio.sleep(3600)

    async def evaluate_stockouts(self):
        logger.info("[Scheduler] Evaluating inventory stockout thresholds across stores...")
        stores = list(db_service.stores.find({}))
        alert_count = 0

        for store in stores:
            store_id = store["store_client_id"]
            store_email = store.get("owner_email", f"{store_id}@predictivevendorml.local")
            store_name = store.get("name", store_id)

            snapshots = list(db_service.inventory_snapshots.find({"store_client_id": store_id}))
            for snap in snapshots:
                sku = snap["sku"]
                try:
                    pred = ml_service.predict_restock(store_id, sku)
                    days_left = pred["days_to_stockout"]
                    if days_left <= 7.0:
                        res = send_stockout_alert(
                            store_client_id=store_id,
                            store_email=store_email,
                            store_name=store_name,
                            sku=sku,
                            product_name=pred["product_name"],
                            current_stock=pred["current_stock"],
                            days_to_stockout=days_left,
                            recommended_qty=pred["recommended_qty"]
                        )
                        if res:
                            alert_count += 1
                            # Add an in-app notification
                            recipient = f"usr_{store_id.lower().replace('-', '_')}"
                            db_service.notifications.insert_one({
                                "recipient_uid": recipient,
                                "type": "STOCKOUT_WARNING",
                                "title": f"Stockout Alert: {pred['product_name']}",
                                "body": f"Predicted stockout in {days_left:.1f} days. Recommended restock: {pred['recommended_qty']} units.",
                                "read": False,
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                except Exception as ex:
                    logger.debug(f"Failed prediction evaluation for {store_id}/{sku}: {ex}")

        logger.info(f"[Scheduler] Stockout evaluation complete. {alert_count} alerts issued.")

scheduler = BackgroundScheduler()
