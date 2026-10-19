"""
Machine Learning Training Pipeline
Performs feature engineering with temporal lag and rolling statistics.
Applies time-series train/test split (no future data leakage).
Compares Ridge Baseline vs. Random Forest vs. Gradient Boosting / XGBoost.
Selects best model by validation RMSE.
Persists model pipeline to 'model.pkl' and evaluation report to 'metrics.json'.
"""

import os
import sys
import json
import argparse
import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Setup Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
DATASET_PATH = REPO_ROOT / "data" / "electronics_transactions.csv"
MODEL_PATH = BACKEND_DIR / "ml_engine" / "model.pkl"
METRICS_PATH = BACKEND_DIR / "ml_engine" / "metrics.json"

def calculate_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    non_zero = y_true > 0
    if not np.any(non_zero):
        return 0.0
    return float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100)

def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    print(f"Engineering temporal lag and rolling features on {len(df):,} records...")
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["store_client_id", "sku", "date"]).reset_index(drop=True)

    # Calendar features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # Grouped lag features per (store, sku)
    grouped = df.groupby(["store_client_id", "sku"])
    df["lag_7"] = grouped["units_sold"].shift(7)
    df["lag_14"] = grouped["units_sold"].shift(14)
    df["lag_28"] = grouped["units_sold"].shift(28)

    # Rolling window statistics (lagged by 1 day to prevent leakage)
    df["rolling_mean_7"] = grouped["units_sold"].shift(1).rolling(7, min_periods=1).mean()
    df["rolling_std_7"] = grouped["units_sold"].shift(1).rolling(7, min_periods=1).std().fillna(0)
    df["rolling_mean_14"] = grouped["units_sold"].shift(1).rolling(14, min_periods=1).mean()

    # Velocity and stock cover
    df["sales_velocity"] = df["rolling_mean_7"].fillna(0)
    df["days_stock_cover"] = (df["current_stock_level"] / (df["sales_velocity"] + 0.1)).clip(0, 180)

    # Fill earliest lag NaNs with 0
    for col in ["lag_7", "lag_14", "lag_28", "rolling_mean_7", "rolling_std_7", "rolling_mean_14", "days_stock_cover"]:
        df[col] = df[col].fillna(0)

    return df

def train_and_evaluate(dataset_path: Path = DATASET_PATH, model_save_path: Path = MODEL_PATH, metrics_save_path: Path = METRICS_PATH):
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset CSV not found at {dataset_path}")

    print(f"Loading dataset from: {dataset_path}")
    raw_df = pd.read_csv(dataset_path)
    df = prepare_features(raw_df)

    # Time-series chronological split: hold out final 60 days for validation
    split_date = df["date"].max() - pd.Timedelta(days=60)
    print(f"Time-series split cutoff date: {split_date.strftime('%Y-%m-%d')} (Test set: last 60 days)")

    train_df = df[df["date"] < split_date].copy()
    test_df = df[df["date"] >= split_date].copy()

    feature_cols = [
        "day_of_week", "month", "day", "is_weekend",
        "promo_flag", "holiday_flag",
        "lag_7", "lag_14", "lag_28",
        "rolling_mean_7", "rolling_std_7", "rolling_mean_14",
        "sales_velocity", "days_stock_cover",
        "lead_time_days", "unit_price",
        "product_category", "store_client_id"
    ]
    categorical_cols = ["product_category", "store_client_id"]
    numeric_cols = [c for c in feature_cols if c not in categorical_cols]

    X_train = train_df[feature_cols]
    y_train = train_df["units_sold"]
    X_test = test_df[feature_cols]
    y_test = test_df["units_sold"]

    print(f"Training samples: {len(X_train):,} | Validation samples: {len(X_test):,}")

    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, numeric_cols),
            ("cat", cat_pipeline, categorical_cols)
        ]
    )

    models = {
        "Ridge Baseline": Ridge(alpha=1.0),
        "RandomForestRegressor": RandomForestRegressor(n_estimators=40, max_depth=12, n_jobs=-1, random_state=42),
        "GradientBoostingRegressor": GradientBoostingRegressor(n_estimators=60, max_depth=5, learning_rate=0.1, random_state=42)
    }

    # Optional XGBoost if available
    try:
        from xgboost import XGBRegressor
        models["XGBoostRegressor"] = XGBRegressor(n_estimators=70, max_depth=5, learning_rate=0.1, n_jobs=-1, random_state=42)
    except ImportError:
        pass

    results = {}
    fitted_pipelines = {}

    print("\n--- Running Model Comparison Tournament ---")
    for name, model in models.items():
        print(f"Training candidate: {name}...")
        pipe = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("regressor", model)
        ])
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        # Demand cannot be negative
        y_pred = np.clip(y_pred, 0, None)

        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        r2 = float(r2_score(y_test, y_pred))
        mape = float(calculate_mape(y_test, y_pred))

        results[name] = {
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "R2": round(r2, 4),
            "MAPE": round(mape, 2)
        }
        fitted_pipelines[name] = pipe
        print(f"  -> {name}: RMSE={rmse:.4f} | MAE={mae:.4f} | R²={r2:.4f} | MAPE={mape:.2f}%")

    # Select best model by lowest validation RMSE
    best_name = min(results, key=lambda k: results[k]["RMSE"])
    best_pipe = fitted_pipelines[best_name]
    best_metrics = results[best_name]

    print(f"\nWinner: {best_name} (Validation RMSE: {best_metrics['RMSE']:.4f})")

    # Extract feature importances
    feature_importance_list = []
    try:
        cat_encoder = best_pipe.named_steps["preprocessor"].named_transformers_["cat"].named_steps["encoder"]
        cat_features = list(cat_encoder.get_feature_names_out(categorical_cols))
        all_feature_names = numeric_cols + cat_features

        regressor = best_pipe.named_steps["regressor"]
        if hasattr(regressor, "feature_importances_"):
            importances = regressor.feature_importances_
        elif hasattr(regressor, "coef_"):
            importances = np.abs(regressor.coef_)
        else:
            importances = np.zeros(len(all_feature_names))

        sorted_idx = np.argsort(importances)[::-1][:15]
        for idx in sorted_idx:
            feature_importance_list.append({
                "feature": all_feature_names[idx],
                "importance": round(float(importances[idx]), 4)
            })
    except Exception as e:
        print(f"Notice on feature importances: {e}")

    # Persist Best Pipeline
    model_save_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_pipe, model_save_path)
    print(f"Trained pipeline persisted to: {model_save_path}")

    # Save detailed metrics.json
    metrics_payload = {
        "version": "1.0.0",
        "training_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "selected_model": best_name,
        "dataset_rows": len(df),
        "date_horizon": f"{df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}",
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "split_method": "Chronological Time-Series (Holdout 60 days)",
        "metrics": best_metrics,
        "model_comparison": results,
        "top_features": feature_importance_list,
        "feature_columns": feature_cols
    }

    metrics_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"Metrics report persisted to: {metrics_save_path}")

    print("\n" + "=" * 60)
    print("           ML TRAINING & EVALUATION COMPLETED           ")
    print("=" * 60)
    return metrics_payload

if __name__ == "__main__":
    train_and_evaluate()
