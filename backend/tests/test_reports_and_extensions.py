def test_pdf_report_export(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/reports/export?format=pdf", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"

def test_csv_report_export(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/reports/export?format=csv", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    lines = res.text.splitlines()
    assert len(lines) > 1
    assert "transaction_id" in lines[0]
    assert "store_client_id" in lines[0]

def test_xlsx_report_export(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/reports/export?format=xlsx", headers=headers)
    assert res.status_code == 200
    assert "application/vnd.openxmlformats" in res.headers["content-type"]
    assert res.content[:2] == b"PK"

def test_extension_anomaly_detection(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get("/api/v1/extensions/anomalies", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "anomalies_detected" in data
    assert "anomalies" in data
    assert len(data["anomalies"]) > 0
    assert "anomaly_score" in data["anomalies"][0]

def test_extension_supplier_scorecard(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get("/api/v1/extensions/supplier-scorecard", headers=headers)
    assert res.status_code == 200
    card = res.json()
    assert "composite_score" in card
    assert "tier" in card
    assert "radar_metrics" in card
    assert len(card["radar_metrics"]) >= 5

def test_extension_smart_po_lifecycle(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    # 1. Create Purchase Order
    payload = {
        "sku": "SKU-WAT-01",
        "quantity": 50,
        "urgency": "High",
        "notes": "Low stock restock triggered from test"
    }
    create_res = client.post("/api/v1/extensions/purchase-orders", json=payload, headers=headers)
    assert create_res.status_code == 201
    po = create_res.json()["purchase_order"]
    po_id = po["po_id"]
    assert po["status"] == "Submitted"
    assert po["quantity"] == 50

    # 2. List Purchase Orders
    list_res = client.get("/api/v1/extensions/purchase-orders", headers=headers)
    assert list_res.status_code == 200
    po_list = list_res.json()
    assert any(p["po_id"] == po_id for p in po_list)

    # 3. Download Generated PO PDF
    pdf_res = client.get(f"/api/v1/extensions/purchase-orders/{po_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content[:4] == b"%PDF"

def test_extension_abc_xyz_matrix(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get("/api/v1/extensions/abc-xyz-matrix", headers=headers)
    assert res.status_code == 200
    matrix = res.json()
    assert "matrix_distribution" in matrix
    assert "AX" in matrix["matrix_distribution"]
    assert len(matrix["items"]) > 0
    assert "segment" in matrix["items"][0]
