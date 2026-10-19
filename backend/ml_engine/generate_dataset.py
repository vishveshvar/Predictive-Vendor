"""
Realistic Synthetic Electronics Transaction Dataset Generator
Produces 40,000+ rows of daily electronics transactions spanning 24 months.
Includes seasonality, monthly pay-cycles, holiday surges, price elasticity,
inventory stockouts, deadstock products, loss causes, and HMAC-SHA256 hashes.
"""

import os
import sys
import hmac
import hashlib
import argparse
import datetime
import json
from pathlib import Path
import numpy as np
import pandas as pd

SECRET_KEY = os.getenv("SECRET_KEY", "predictive-vendor-secret-key-32-chars-min")

# Product Catalog (SKU, Category, Name, Brand, Unit Cost, Unit Price, Base Velocity, Lead Time Days)
PRODUCTS = [
    {"sku": "SKU-WAT-01", "product_category": "Smartwatches", "name": "Apex Pulse Pro Watch", "brand": "ApexTech", "unit_cost": 120.0, "unit_price": 249.99, "lead_time_days": 12, "base_velocity": 4.5, "growth": 0.25, "elasticity": -1.2},
    {"sku": "SKU-WAT-02", "product_category": "Smartwatches", "name": "Chronos Fit Slim", "brand": "Chronos", "unit_cost": 45.0, "unit_price": 99.99, "lead_time_days": 8, "base_velocity": 7.0, "growth": 0.15, "elasticity": -1.5},
    {"sku": "SKU-EAR-01", "product_category": "Wireless Earbuds", "name": "AeroBuds ANC Ultra", "brand": "AeroSound", "unit_cost": 55.0, "unit_price": 149.99, "lead_time_days": 7, "base_velocity": 9.0, "growth": 0.30, "elasticity": -1.3},
    {"sku": "SKU-EAR-02", "product_category": "Wireless Earbuds", "name": "SoundMini Pods", "brand": "SoundMini", "unit_cost": 18.0, "unit_price": 39.99, "lead_time_days": 5, "base_velocity": 14.0, "growth": 0.10, "elasticity": -1.8},
    {"sku": "SKU-GAN-01", "product_category": "GaN Chargers", "name": "HyperVolt 100W GaN III", "brand": "HyperVolt", "unit_cost": 22.0, "unit_price": 59.99, "lead_time_days": 6, "base_velocity": 8.0, "growth": 0.40, "elasticity": -1.1},
    {"sku": "SKU-GAN-02", "product_category": "GaN Chargers", "name": "NanoCharge 65W Duo", "brand": "HyperVolt", "unit_cost": 14.0, "unit_price": 34.99, "lead_time_days": 5, "base_velocity": 12.0, "growth": 0.35, "elasticity": -1.2},
    {"sku": "SKU-KEY-01", "product_category": "Mechanical Keyboards", "name": "TactilePro RGB 75%", "brand": "KeyCraft", "unit_cost": 65.0, "unit_price": 139.99, "lead_time_days": 14, "base_velocity": 3.8, "growth": 0.18, "elasticity": -0.9},
    {"sku": "SKU-KEY-02", "product_category": "Mechanical Keyboards", "name": "Stealth Wireless Low-Profile", "brand": "KeyCraft", "unit_cost": 80.0, "unit_price": 169.99, "lead_time_days": 15, "base_velocity": 3.0, "growth": 0.20, "elasticity": -0.8},
    {"sku": "SKU-POW-01", "product_category": "Power Banks", "name": "MegaPack 25,000mAh Laptop Power", "brand": "VoltGo", "unit_cost": 38.0, "unit_price": 89.99, "lead_time_days": 9, "base_velocity": 6.0, "growth": 0.12, "elasticity": -1.4},
    {"sku": "SKU-POW-02", "product_category": "Power Banks", "name": "SlimMag 5000mAh Magnetic", "brand": "VoltGo", "unit_cost": 15.0, "unit_price": 39.99, "lead_time_days": 7, "base_velocity": 8.5, "growth": 0.22, "elasticity": -1.3},
    {"sku": "SKU-SPE-01", "product_category": "Bluetooth Speakers", "name": "BoomBlast 360 Rugged", "brand": "SonicWave", "unit_cost": 42.0, "unit_price": 99.99, "lead_time_days": 10, "base_velocity": 5.0, "growth": 0.05, "elasticity": -1.4},
    {"sku": "SKU-SPE-02", "product_category": "Bluetooth Speakers", "name": "PocketEcho Micro Speaker", "brand": "SonicWave", "unit_cost": 12.0, "unit_price": 29.99, "lead_time_days": 6, "base_velocity": 9.5, "growth": 0.02, "elasticity": -1.6},
    {"sku": "SKU-CAM-01", "product_category": "Webcams", "name": "ClearView 4K Studio Pro", "brand": "OptiCam", "unit_cost": 75.0, "unit_price": 179.99, "lead_time_days": 11, "base_velocity": 3.2, "growth": -0.05, "elasticity": -1.0},
    {"sku": "SKU-MOU-01", "product_category": "Gaming Mice", "name": "ViperSpeed Ultralight 48g", "brand": "RazorEdge", "unit_cost": 32.0, "unit_price": 79.99, "lead_time_days": 8, "base_velocity": 7.2, "growth": 0.22, "elasticity": -1.1},
    {"sku": "SKU-HUB-01", "product_category": "USB-C Hubs", "name": "MultiPort 9-in-1 Dual 4K", "brand": "LinkPro", "unit_cost": 28.0, "unit_price": 69.99, "lead_time_days": 7, "base_velocity": 6.8, "growth": 0.08, "elasticity": -1.2},
    {"sku": "SKU-PLU-01", "product_category": "Smart Plugs", "name": "HomeEnergy Wi-Fi Monitor 4-Pack", "brand": "EcoVolt", "unit_cost": 19.0, "unit_price": 44.99, "lead_time_days": 6, "base_velocity": 5.5, "growth": 0.15, "elasticity": -1.3},
    {"sku": "SKU-ACT-01", "product_category": "Action Cameras", "name": "Vanguard 5K Waterproof Cam", "brand": "Vanguard", "unit_cost": 140.0, "unit_price": 299.99, "lead_time_days": 16, "base_velocity": 1.8, "growth": -0.15, "elasticity": -1.7},
    {"sku": "SKU-TAB-01", "product_category": "Tablets", "name": "TabLite 10.5 High-Res Display", "brand": "NexTab", "unit_cost": 160.0, "unit_price": 329.99, "lead_time_days": 14, "base_velocity": 2.6, "growth": 0.10, "elasticity": -1.1},
    {"sku": "SKU-DIS-01", "product_category": "Smart Displays", "name": "EchoVision 8 Smart Screen", "brand": "VisionHub", "unit_cost": 65.0, "unit_price": 129.99, "lead_time_days": 9, "base_velocity": 3.4, "growth": 0.14, "elasticity": -1.3},
    {"sku": "SKU-HEA-01", "product_category": "Headphones", "name": "AuraQuiet Hybrid ANC Over-Ear", "brand": "AeroSound", "unit_cost": 95.0, "unit_price": 219.99, "lead_time_days": 12, "base_velocity": 4.1, "growth": 0.28, "elasticity": -1.2},
    # Deadstock items intentionally included (very low velocity, persistent overstock)
    {"sku": "SKU-DED-01", "product_category": "Accessories", "name": "Retro 30-Pin Legacy Dock Adapter", "brand": "VintageLink", "unit_cost": 15.0, "unit_price": 24.99, "lead_time_days": 21, "base_velocity": 0.08, "growth": -0.60, "elasticity": -0.5, "is_deadstock": True},
    {"sku": "SKU-DED-02", "product_category": "Accessories", "name": "Micro-USB Corded Car Mount 2018", "brand": "VintageLink", "unit_cost": 8.0, "unit_price": 14.99, "lead_time_days": 25, "base_velocity": 0.05, "growth": -0.70, "elasticity": -0.4, "is_deadstock": True}
]

# Stores Metadata (Size Profile: multiplier)
STORES = [
    {"store_client_id": "STORE-001", "name": "Apex Electronics Metro Flagship", "city": "San Francisco", "region": "West", "lat": 37.7749, "lng": -122.4194, "multiplier": 1.6, "owner_email": "client1@store.com"},
    {"store_client_id": "STORE-002", "name": "TechHaven Downtown Hub", "city": "New York", "region": "East", "lat": 40.7128, "lng": -74.0060, "multiplier": 1.5, "owner_email": "client2@store.com"},
    {"store_client_id": "STORE-003", "name": "Silicon Gateway Retail", "city": "Austin", "region": "South", "lat": 30.2672, "lng": -97.7431, "multiplier": 1.2, "owner_email": "austin.store@example.com"},
    {"store_client_id": "STORE-004", "name": "Pacific Pulse Gadgetry", "city": "Seattle", "region": "West", "lat": 47.6062, "lng": -122.3321, "multiplier": 1.1, "owner_email": "seattle.store@example.com"},
    {"store_client_id": "STORE-005", "name": "Midwest Smart Systems", "city": "Chicago", "region": "North", "lat": 41.8781, "lng": -87.6298, "multiplier": 1.3, "owner_email": "chicago.store@example.com"},
    {"store_client_id": "STORE-006", "name": "Sunbelt Audio & Tech", "city": "Miami", "region": "South", "lat": 25.7617, "lng": -80.1918, "multiplier": 0.9, "owner_email": "miami.store@example.com"},
    {"store_client_id": "STORE-007", "name": "Rocky Mountain Gear", "city": "Denver", "region": "West", "lat": 39.7392, "lng": -104.9903, "multiplier": 0.85, "owner_email": "denver.store@example.com"},
    {"store_client_id": "STORE-008", "name": "Great Lakes Digital Emporium", "city": "Detroit", "region": "North", "lat": 42.3314, "lng": -83.0458, "multiplier": 0.8, "owner_email": "detroit.store@example.com"}
]

SUPPLIER_ID = "SUP-WHOLESALE-01"

LOSS_CAUSES = [
    "None",
    "Transit Damage",
    "Manufacturer Defect",
    "Dead-on-Arrival",
    "Theft/Shrinkage",
    "Expired Promotion"
]

def generate_hash(order_id: str, store_id: str, date_str: str) -> str:
    """Verifiable HMAC-SHA256 truncated hash for supply chain tracking."""
    msg = f"{order_id}:{store_id}:{date_str}".encode("utf-8")
    h = hmac.new(SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return h[:16].upper()

def is_holiday(date: datetime.date) -> tuple[bool, str]:
    m, d = date.month, date.day
    # Black Friday weekend (Late Nov)
    if m == 11 and 23 <= d <= 29 and date.weekday() in (4, 5, 6):
        return True, "Black Friday"
    # Cyber Monday
    if (m == 11 and d >= 26 and date.weekday() == 0) or (m == 12 and d <= 2 and date.weekday() == 0):
        return True, "Cyber Monday"
    # Diwali Festive Window (Oct / Nov)
    if (m == 10 and 20 <= d <= 28) or (m == 11 and 10 <= d <= 15):
        return True, "Diwali Festival"
    # Christmas & Year-End
    if m == 12 and 18 <= d <= 26:
        return True, "Christmas Sale"
    if m == 12 and 27 <= d <= 31:
        return True, "Year-End Clearance"
    # Prime Tech Days (July)
    if m == 7 and 10 <= d <= 13:
        return True, "Summer Tech Days"
    return False, ""

def generate_dataset(start_date_str="2024-10-01", end_date_str="2026-10-01", seed=42, target_rows=40000) -> pd.DataFrame:
    np.random.seed(seed)
    start_date = datetime.date.fromisoformat(start_date_str)
    end_date = datetime.date.fromisoformat(end_date_str)
    delta_days = (end_date - start_date).days
    dates = [start_date + datetime.timedelta(days=i) for i in range(delta_days)]

    records = []
    
    # Track inventory per (store, sku) statefully
    inventory_tracker = {}
    for store in STORES:
        for p in PRODUCTS:
            initial_stock = int(np.random.uniform(30, 90) * store["multiplier"])
            if p.get("is_deadstock"):
                initial_stock = int(np.random.uniform(120, 200)) # high deadstock
            inventory_tracker[(store["store_client_id"], p["sku"])] = initial_stock

    # Pending replenishment pipeline: list of (replenish_date, store_id, sku, qty)
    replenishment_pipeline = []

    print(f"Generating realistic dataset across {len(dates)} days ({start_date} to {end_date}) for {len(STORES)} stores and {len(PRODUCTS)} SKUs...")

    txn_counter = 100000

    for current_date in dates:
        date_str = current_date.isoformat()
        dow = current_date.weekday() # 0 = Mon, 6 = Sun
        day_of_month = current_date.day
        year_progress = (current_date - start_date).days / 730.0 # 0.0 to 1.0

        # Receive pending replenishments
        arrived = [item for item in replenishment_pipeline if item[0] <= current_date]
        replenishment_pipeline = [item for item in replenishment_pipeline if item[0] > current_date]
        for _, s_id, sku, qty in arrived:
            inventory_tracker[(s_id, sku)] += qty

        is_hol, hol_name = is_holiday(current_date)
        holiday_flag = 1 if is_hol else 0

        # Weekend uplift: Sat/Sun has 35-50% higher volume
        weekend_mult = 1.45 if dow in (5, 6) else (1.15 if dow == 4 else 1.0)

        # Monthly pay-cycle effect: 1st-5th and 28th-31st has 20-30% uplift
        paycycle_mult = 1.25 if (day_of_month <= 5 or day_of_month >= 28) else 1.0

        # Holiday multiplier
        holiday_mult = 2.1 if holiday_flag else 1.0

        for store in STORES:
            s_id = store["store_client_id"]
            s_mult = store["multiplier"]

            for p in PRODUCTS:
                sku = p["sku"]
                current_stock = inventory_tracker[(s_id, sku)]

                # Promotional campaign simulation (periodic discounts)
                promo_active = 0
                price_discount = 0.0
                if not p.get("is_deadstock"):
                    if np.random.rand() < 0.12 or (holiday_flag and np.random.rand() < 0.35):
                        promo_active = 1
                        price_discount = float(np.random.choice([0.10, 0.15, 0.20, 0.25]))

                effective_price = round(p["unit_price"] * (1.0 - price_discount), 2)
                price_ratio = effective_price / p["unit_price"]

                # Price elasticity demand shift: (P/P0)^elasticity
                elasticity_factor = (price_ratio) ** p.get("elasticity", -1.2)

                # Category trend over 24 months
                trend_factor = 1.0 + (p.get("growth", 0.0) * year_progress)

                # Expected demand lambda for Poisson/Gamma sales
                base_v = p["base_velocity"]
                expected_sales = (
                    base_v * 
                    s_mult * 
                    weekend_mult * 
                    paycycle_mult * 
                    holiday_mult * 
                    elasticity_factor * 
                    trend_factor
                )

                if promo_active:
                    expected_sales *= 1.35 # promotion bump

                # Simulate daily sales units
                if p.get("is_deadstock"):
                    actual_units_demanded = np.random.choice([0, 0, 0, 1], p=[0.85, 0.10, 0.04, 0.01])
                else:
                    actual_units_demanded = int(np.random.poisson(max(0.1, expected_sales)))

                # Stockout constraint: cannot sell more than on-hand stock
                units_sold = min(current_stock, actual_units_demanded)
                stockout_occurred = (current_stock == 0 or (actual_units_demanded > current_stock))

                # Update stock
                current_stock -= units_sold
                inventory_tracker[(s_id, sku)] = current_stock

                # Replenishment triggering (reorder point simulation)
                # Reorder point: lead_time * base_velocity * 1.5
                lead_time = p["lead_time_days"]
                # Store lead-time variation: South & North might take +1 to +3 days
                if store["region"] in ["South", "North"]:
                    lead_time += np.random.choice([0, 1, 2])
                
                reorder_threshold = int(p["lead_time_days"] * p["base_velocity"] * s_mult * 1.4)
                if current_stock <= reorder_threshold and not p.get("is_deadstock"):
                    # Check if an order is already pending
                    already_ordered = any(item[1] == s_id and item[2] == sku for item in replenishment_pipeline)
                    if not already_ordered:
                        # Order quantity
                        reorder_qty = int(max(20, (reorder_threshold * 2.5) + np.random.uniform(5, 20)))
                        arrival_date = current_date + datetime.timedelta(days=int(lead_time))
                        replenishment_pipeline.append((arrival_date, s_id, sku, reorder_qty))

                # Loss Cause Modeling
                # Correlated with category fragility, lead time, and product complexity
                loss_cause = "None"
                loss_rnd = np.random.rand()
                if loss_rnd < 0.055: # ~5.5% experience loss or return
                    # Fragile categories (Tablets, Webcams, Speakers) have higher transit damage
                    if p["product_category"] in ["Tablets", "Webcams", "Bluetooth Speakers"] and lead_time > 10 and np.random.rand() < 0.45:
                        loss_cause = "Transit Damage"
                    elif p["product_category"] in ["Smartwatches", "Action Cameras", "Mechanical Keyboards"] and np.random.rand() < 0.40:
                        loss_cause = "Manufacturer Defect"
                    elif promo_active and price_discount > 0.15 and np.random.rand() < 0.30:
                        loss_cause = "Expired Promotion"
                    elif np.random.rand() < 0.25:
                        loss_cause = "Dead-on-Arrival"
                    else:
                        loss_cause = "Theft/Shrinkage"

                # Financial calculations
                total_revenue = round(units_sold * effective_price, 2)
                total_cost = round(units_sold * p["unit_cost"], 2)
                gross_margin = round(total_revenue - total_cost, 2)

                txn_counter += 1
                txn_id = f"TXN-{txn_counter}"
                order_ref = f"ORD-{(txn_counter % 9000) + 1000}"
                qr_hash = generate_hash(order_ref, s_id, date_str)

                records.append({
                    "transaction_id": txn_id,
                    "date": date_str,
                    "store_client_id": s_id,
                    "store_name": store["name"],
                    "region": store["region"],
                    "sku": sku,
                    "product_name": p["name"],
                    "product_category": p["product_category"],
                    "brand": p["brand"],
                    "unit_cost": p["unit_cost"],
                    "unit_price": effective_price,
                    "units_sold": units_sold,
                    "units_demanded": actual_units_demanded,
                    "current_stock_level": current_stock,
                    "lead_time_days": lead_time,
                    "promo_flag": promo_active,
                    "holiday_flag": holiday_flag,
                    "holiday_name": hol_name if holiday_flag else "None",
                    "loss_cause": loss_cause,
                    "total_revenue": total_revenue,
                    "total_cost": total_cost,
                    "gross_margin": gross_margin,
                    "qr_tracking_hash": qr_hash,
                    "supplier_id": SUPPLIER_ID,
                    "stockout_flag": 1 if stockout_occurred else 0
                })

    df = pd.DataFrame(records)
    print(f"Total synthetic records generated: {len(df):,}")
    return df

def print_data_quality_report(df: pd.DataFrame):
    print("=" * 70)
    print("           DATASET QUALITY & FIDELITY REPORT           ")
    print("=" * 70)
    print(f"Total Rows Generated : {len(df):,}")
    print(f"Date Horizon         : {df['date'].min()} to {df['date'].max()} ({(pd.to_datetime(df['date'].max()) - pd.to_datetime(df['date'].min())).days} days)")
    print(f"Unique Stores        : {df['store_client_id'].nunique()} ({list(df['store_client_id'].unique())})")
    print(f"Unique Categories    : {df['product_category'].nunique()}")
    print(f"Unique SKUs          : {df['sku'].nunique()}")
    print(f"Total Gross Revenue  : ${df['total_revenue'].sum():,.2f}")
    print(f"Total Units Sold     : {df['units_sold'].sum():,}")
    print(f"Total Stockout Days  : {df['stockout_flag'].sum():,} ({df['stockout_flag'].mean()*100:.2f}%)")
    print(f"Missing / Null Values: {df.isnull().sum().sum()}")
    print("-" * 70)
    print("Category Breakdown:")
    cat_summary = df.groupby("product_category").agg(
        Units=("units_sold", "sum"),
        Revenue=("total_revenue", "sum"),
        Stockouts=("stockout_flag", "sum")
    ).sort_values("Revenue", ascending=False)
    print(cat_summary.to_string())
    print("-" * 70)
    print("Loss Cause Distribution:")
    print(df["loss_cause"].value_counts(normalize=True).mul(100).round(2).to_string())
    print("-" * 70)
    print("Sample Verifiable Hashes:")
    for h in df["qr_tracking_hash"].head(3):
        print(f"  - {h}")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="Electronics Transactions Dataset Generator")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default 42)")
    parser.add_argument("--rows", type=int, default=40000, help="Target row threshold")
    parser.add_argument("--out", type=str, default="data/electronics_transactions.csv", help="Output CSV path")
    args = parser.parse_args()

    out_path = Path(args.out)
    if not out_path.is_absolute():
        # resolve relative to repo root
        repo_root = Path(__file__).resolve().parent.parent.parent
        out_path = repo_root / args.out
    
    out_path.parent.mkdir(parents=True, exist_ok=True)

    df = generate_dataset(seed=args.seed, target_rows=args.rows)
    df.to_csv(out_path, index=False)
    print(f"Dataset successfully saved to: {out_path}")

    print_data_quality_report(df)

if __name__ == "__main__":
    main()
