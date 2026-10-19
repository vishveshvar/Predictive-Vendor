def test_predict_restock_inference(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    payload = {"sku": "SKU-WAT-01"}
    res = client.post("/api/v1/predictions/predict-restock", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["sku"] == "SKU-WAT-01"
    assert data["store_client_id"] == "STORE-001"
    assert data["forecast_7d"] > 0
    assert data["days_to_stockout"] >= 0
    assert data["risk_level"] in ["Critical", "High", "Medium", "Low"]
    assert len(data["daily_forecast"]) == 30

def test_what_if_sensitivity(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    # 1. Baseline
    base_res = client.post(
        "/api/v1/predictions/predict-restock",
        json={"sku": "SKU-WAT-01", "store_client_id": "STORE-001"},
        headers=headers
    )
    assert base_res.status_code == 200
    base_data = base_res.json()

    # 2. What-if with discount and long lead time
    mod_res = client.post(
        "/api/v1/predictions/predict-restock",
        json={
            "sku": "SKU-WAT-01",
            "store_client_id": "STORE-001",
            "price_override": 179.99,
            "lead_time_override": 25,
            "promo_override": 1
        },
        headers=headers
    )
    assert mod_res.status_code == 200
    mod_data = mod_res.json()

    # The price cut & promo must increase forecast demand
    assert mod_data["forecast_7d"] > base_data["forecast_7d"]
    # The extended lead time must adjust safety stock or recommended order
    assert mod_data["safety_stock"] >= base_data["safety_stock"]

def test_get_metrics(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get("/api/v1/predictions/metrics", headers=headers)
    assert res.status_code == 200
    metrics = res.json()
    assert "metrics" in metrics
    assert "MAE" in metrics["metrics"]
    assert "RMSE" in metrics["metrics"]
    assert "R2" in metrics["metrics"]
    assert "top_features" in metrics
