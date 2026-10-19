import pytest

CLIENT_QUERY_IDS = [
    "top_sellers",
    "deadstock_items",
    "stockout_risks",
    "profit_summary",
    "loss_causes",
    "pending_rmas",
    "order_status",
    "best_margin_category"
]

SUPPLIER_QUERY_IDS = [
    "top_client_volume",
    "total_open_rmas",
    "fastest_growing_category",
    "average_resolution_time",
    "regional_demand",
    "low_performing_skus",
    "delayed_shipments",
    "forecast_demand_30d"
]

@pytest.mark.parametrize("query_id", CLIENT_QUERY_IDS)
def test_all_client_predefined_queries(client, client_token, query_id):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get(f"/api/v1/chat/predefined?query_id={query_id}", headers=headers)
    assert res.status_code == 200, f"Query {query_id} failed with {res.text}"
    data = res.json()
    assert data["query_id"] == query_id
    assert "text" in data
    assert len(data["text"]) > 10
    assert "chart_data" in data
    assert "table_rows" in data

@pytest.mark.parametrize("query_id", SUPPLIER_QUERY_IDS)
def test_all_supplier_predefined_queries(client, supplier_token, query_id):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get(f"/api/v1/chat/predefined?query_id={query_id}", headers=headers)
    assert res.status_code == 200, f"Query {query_id} failed with {res.text}"
    data = res.json()
    assert data["query_id"] == query_id
    assert "text" in data
    assert len(data["text"]) > 10
    assert "chart_data" in data
    assert "table_rows" in data

def test_unknown_query_id_returns_400(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/chat/predefined?query_id=unknown_fake_id", headers=headers)
    assert res.status_code == 400
    assert res.json()["code"] == "QUERY_ERROR"
