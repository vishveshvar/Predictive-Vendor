"""
ML Prediction and What-If Restocking Engine Service
Loads trained model pipeline and evaluation metrics.
Calculates 7, 14, and 30-day demand forecasts, days to stockout, risk gauges,
and dynamic replenishment quantities with safety stock formulas.
Supports what-if sensitivity simulations (price shifts, lead times, promotions).
"""

import os
import sys
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

from app.core.config import settings
from app.services.db import db_service

logger = logging.getLogger("app.ml")

class MLService:
    def __init__(self):
        self._pipeline = None
        self._metrics = None
        self._load_artifacts()

    def _load_artifacts(self):
        model_path = settings.MODEL_PATH
        metrics_path = settings.METRICS_PATH

        if model_path.exists():
            try:
                self._pipeline = joblib.load(model_path)
                logger.info(f"Loaded ML model pipeline from: {model_path}")
            except Exception as e:
                logger.error(f"Failed to load ML pipeline: {e}")
                self._pipeline = None
        else:
            logger.warning(f"Model file not found at: {model_path}")

        if metrics_path.exists():
            try:
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self._metrics = json.load(f)
                logger.info(f"Loaded ML metrics from: {metrics_path}")
            except Exception as e:
                logger.error(f"Failed to load metrics: {e}")
                self._metrics = None
        else:
            logger.warning(f"Metrics file not found at: {metrics_path}")

    @property
    def is_ready(self) -> bool:
        return self._pipeline is not None

    def get_metrics(self) -> Dict[str, Any]:
        if self._metrics is None:
            self._load_artifacts()
        if self._metrics:
            return self._metrics
        return {
            "status": "not_trained",
            "message": "Model has not been trained yet. Call POST /api/v1/ml/retrain."
        }

    def predict_restock(
        self,
        store_client_id: str,
        sku: str,
        price_override: Optional[float] = None,
        lead_time_override: Optional[int] = None,
        promo_override: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generates ML forecast and stockout risk analysis for a specific product and store.
        """
        if self._pipeline is None:
            self._load_artifacts()
            if self._pipeline is None:
                raise RuntimeError("ML model pipeline is not ready. Train the model first.")

        # 1. Fetch Product Metadata
        product = db_service.products.find_one({"sku": sku})
        if not product:
            raise ValueError(f"SKU '{sku}' not found in catalog.")

        # 2. Fetch Store Metadata
        store = db_service.stores.find_one({"store_client_id": store_client_id})
        if not store:
            raise ValueError(f"Store '{store_client_id}' not found.")

        # 3. Fetch Current Stock Level
        snapshot = db_service.inventory_snapshots.find_one({"store_client_id": store_client_id, "sku": sku})
        current_stock = int(snapshot["stock_level"]) if snapshot else 25

        # 4. Fetch Recent Transactions to construct lag and rolling context
        recent_txns = list(
            db_service.transactions.find(
                {"store_client_id": store_client_id, "sku": sku}
            ).sort("date", -1).limit(45)
        )
        recent_txns.reverse()  # chronological order

        # Determine effective parameters
        unit_price = float(price_override if price_override is not None else product["unit_price"])
        lead_time = int(lead_time_override if lead_time_override is not None else product["supplier_lead_time_days"])
        promo_flag = int(promo_override if promo_override is not None else 0)

        # Baseline recent statistics
        if recent_txns:
            recent_sales = [t.get("units_sold", 0) for t in recent_txns]
            lag_7 = recent_sales[-7] if len(recent_sales) >= 7 else recent_sales[-1]
            lag_14 = recent_sales[-14] if len(recent_sales) >= 14 else recent_sales[-1]
            lag_28 = recent_sales[-28] if len(recent_sales) >= 28 else recent_sales[-1]
            rolling_7 = float(np.mean(recent_sales[-7:])) if len(recent_sales) >= 7 else float(np.mean(recent_sales))
            rolling_std = float(np.std(recent_sales[-7:])) if len(recent_sales) >= 7 else 1.0
            rolling_14 = float(np.mean(recent_sales[-14:])) if len(recent_sales) >= 14 else rolling_7
        else:
            base_v = float(product.get("base_velocity", 4.0)) * float(store.get("multiplier", 1.0))
            lag_7, lag_14, lag_28 = base_v, base_v, base_v
            rolling_7, rolling_std, rolling_14 = base_v, 1.2, base_v
            recent_sales = [int(base_v)] * 14

        # 5. Multi-Step Daily Forecast over next 30 days
        today = datetime.date.today()
        daily_forecast = []
        running_stock = current_stock
        stockout_day = None
        simulated_sales = list(recent_sales)

        for day_offset in range(1, 31):
            target_date = today + datetime.timedelta(days=day_offset)
            dow = target_date.weekday()
            is_weekend = 1 if dow in (5, 6) else 0

            # Holiday check (simple calendar logic)
            m, d = target_date.month, target_date.day
            holiday_flag = 1 if ((m == 11 and 23 <= d <= 29) or (m == 12 and 20 <= d <= 31)) else 0

            # Rolling window based on current simulation history
            r_mean_7 = float(np.mean(simulated_sales[-7:]))
            r_std_7 = float(np.std(simulated_sales[-7:]))
            r_mean_14 = float(np.mean(simulated_sales[-14:]))
            cur_velocity = r_mean_7
            days_cover = min(180.0, running_stock / (cur_velocity + 0.1))

            # Assemble feature dictionary
            feature_row = {
                "day_of_week": dow,
                "month": target_date.month,
                "day": target_date.day,
                "is_weekend": is_weekend,
                "promo_flag": promo_flag,
                "holiday_flag": holiday_flag,
                "lag_7": simulated_sales[-7] if len(simulated_sales) >= 7 else simulated_sales[-1],
                "lag_14": simulated_sales[-14] if len(simulated_sales) >= 14 else simulated_sales[-1],
                "lag_28": simulated_sales[-28] if len(simulated_sales) >= 28 else simulated_sales[-1],
                "rolling_mean_7": r_mean_7,
                "rolling_std_7": r_std_7,
                "rolling_mean_14": r_mean_14,
                "sales_velocity": cur_velocity,
                "days_stock_cover": days_cover,
                "lead_time_days": lead_time,
                "unit_price": unit_price,
                "product_category": product["product_category"],
                "store_client_id": store_client_id
            }

            feature_df = pd.DataFrame([feature_row])
            predicted_units = float(self._pipeline.predict(feature_df)[0])
            predicted_units = max(0.0, round(predicted_units, 2))

            # What-if price elasticity adjustment if price was overridden
            if price_override is not None and product["unit_price"] > 0:
                p_ratio = price_override / product["unit_price"]
                elasticity = -1.2  # consumer electronics benchmark
                predicted_units = max(0.0, round(predicted_units * (p_ratio ** elasticity), 2))

            simulated_sales.append(predicted_units)

            # Check stock depletion
            running_stock = max(0, running_stock - predicted_units)
            if running_stock == 0 and stockout_day is None:
                stockout_day = day_offset

            # Confidence interval (+/- 1.65 * rolling_std)
            margin = round(1.65 * max(0.5, r_std_7), 2)

            daily_forecast.append({
                "date": target_date.isoformat(),
                "day_offset": day_offset,
                "predicted_demand": predicted_units,
                "demand_lower": max(0.0, round(predicted_units - margin, 2)),
                "demand_upper": round(predicted_units + margin, 2),
                "projected_stock": round(running_stock, 1)
            })

        # Aggregated windows
        forecast_7d = round(sum(d["predicted_demand"] for d in daily_forecast[:7]), 1)
        forecast_14d = round(sum(d["predicted_demand"] for d in daily_forecast[:14]), 1)
        forecast_30d = round(sum(d["predicted_demand"] for d in daily_forecast), 1)

        daily_velocity = round(forecast_7d / 7.0, 2)
        days_to_stockout = round(current_stock / max(0.1, daily_velocity), 1)

        # Risk Classification
        if days_to_stockout <= lead_time:
            risk_level = "Critical"
        elif days_to_stockout <= lead_time + 3:
            risk_level = "High"
        elif days_to_stockout <= lead_time + 7:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Safety Stock & Recommended Order Quantity
        # Safety Stock formula: Z * sigma_daily * sqrt(lead_time)
        z_factor = 1.65  # 95% service level
        effective_sigma = max(0.8, float(np.std([d["predicted_demand"] for d in daily_forecast[:lead_time]])))
        safety_stock = int(np.ceil(z_factor * effective_sigma * np.sqrt(lead_time)))

        lead_time_forecast = sum(d["predicted_demand"] for d in daily_forecast[:lead_time])
        recommended_qty = int(max(0, np.ceil(lead_time_forecast + safety_stock - current_stock)))

        # Historical comparison points (last 14 days)
        history_points = []
        for t in recent_txns[-14:]:
            history_points.append({
                "date": t["date"],
                "units_sold": int(t.get("units_sold", 0)),
                "stock_level": int(t.get("current_stock_level", 0))
            })

        return {
            "store_client_id": store_client_id,
            "sku": sku,
            "product_name": product["name"],
            "product_category": product["product_category"],
            "current_stock": current_stock,
            "unit_price": unit_price,
            "lead_time_days": lead_time,
            "promo_active": bool(promo_flag),
            "daily_velocity": daily_velocity,
            "days_to_stockout": days_to_stockout,
            "projected_stockout_date": (today + datetime.timedelta(days=int(days_to_stockout))).isoformat() if days_to_stockout < 90 else None,
            "risk_level": risk_level,
            "safety_stock": safety_stock,
            "forecast_7d": forecast_7d,
            "forecast_14d": forecast_14d,
            "forecast_30d": forecast_30d,
            "recommended_qty": recommended_qty,
            "daily_forecast": daily_forecast,
            "historical_trajectory": history_points,
            "model_version": self._metrics.get("version", "1.0.0") if self._metrics else "1.0.0",
            "evaluated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

ml_service = MLService()
