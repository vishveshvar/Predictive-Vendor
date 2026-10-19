"""
End-to-End System Integration Test (Section 15 Master Prompt)
Executes the full 11-step commercial procurement lifecycle:
Client 1 -> BI Assistant -> ML Restock -> What-If -> Submit RMA -> Supplier Login ->
Kanban Advance -> Order Dispatch & HMAC QR -> Public Tracking -> PDF Export -> Tenant Isolation
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_lifecycle_e2e():
    # -------------------------------------------------------------
    # Step 1: Sign in as Client 1 (STORE-001: Apex Metro Flagship)
    # -------------------------------------------------------------
    login_resp = client.post("/api/v1/auth/login", json={"email": "client1@store.com", "password": "password"})
    assert login_resp.status_code == 200
    client1_token = login_resp.json()["access_token"]
    client1_headers = {"Authorization": f"Bearer {client1_token}"}
    assert login_resp.json()["user"]["store_client_id"] == "STORE-001"
    assert login_resp.json()["user"]["role"] == "client"

    # -------------------------------------------------------------
    # Step 2: Ask AI BI Assistant: Deadstock & sluggish velocity items
    # -------------------------------------------------------------
    chat_resp = client.get("/api/v1/chat/predefined?query_id=deadstock_items", headers=client1_headers)
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert chat_data["query_id"] == "deadstock_items"
    assert "table_rows" in chat_data
    assert "text" in chat_data

    # -------------------------------------------------------------
    # Step 3: Run Restock Prediction for SKU-WAT-01
    # -------------------------------------------------------------
    pred_payload = {"sku": "SKU-WAT-01"}
    pred_resp = client.post("/api/v1/predictions/predict-restock", json=pred_payload, headers=client1_headers)
    assert pred_resp.status_code == 200
    pred_data = pred_resp.json()
    assert pred_data["sku"] == "SKU-WAT-01"
    assert pred_data["store_client_id"] == "STORE-001"
    assert pred_data["days_to_stockout"] > 0
    assert pred_data["safety_stock"] >= 0
    assert pred_data["recommended_qty"] >= 0
    assert pred_data["risk_level"] in ["Critical", "High", "Medium", "Low"]

    # -------------------------------------------------------------
    # Step 4: Adjust What-If Simulator (price discount + lead time shift)
    # -------------------------------------------------------------
    base_price = pred_data.get("price_override", 149.99) or 149.99
    whatif_payload = {
        "sku": "SKU-WAT-01",
        "price_override": round(base_price * 0.85, 2), # 15% discount
        "lead_time_override": 5, # 2 days shorter
        "promo_override": 1
    }
    whatif_resp = client.post("/api/v1/predictions/predict-restock", json=whatif_payload, headers=client1_headers)
    assert whatif_resp.status_code == 200
    whatif_data = whatif_resp.json()
    assert whatif_data["forecast_7d"] >= pred_data["forecast_7d"] # Discount & promo drive demand up!

    # -------------------------------------------------------------
    # Step 5: Submit an RMA ticket for a damaged item from recent order
    # -------------------------------------------------------------
    orders_resp = client.get("/api/v1/client/orders", headers=client1_headers)
    assert orders_resp.status_code == 200
    client_orders = orders_resp.json()["orders"]
    existing_order_id = client_orders[0]["order_id"] if client_orders else "ORD-7001"

    rma_payload = {
        "order_id": existing_order_id,
        "sku": "SKU-WAT-01",
        "defect_type": "Transit Damage",
        "quantity": 3,
        "description": "Outer packaging crushed during transit; LED screen cracked."
    }
    rma_resp = client.post("/api/v1/rma/tickets", json=rma_payload, headers=client1_headers)
    assert rma_resp.status_code == 201
    rma_data = rma_resp.json()
    ticket_id = rma_data["ticket"]["ticket_id"]
    assert ticket_id.startswith("RMA-")
    assert rma_data["ticket"]["status"] in ["Open", "OPEN"]

    # -------------------------------------------------------------
    # Step 6 & 7: Sign out Client 1 & Sign in as Supplier
    # -------------------------------------------------------------
    sup_login = client.post("/api/v1/auth/login", json={"email": "supplier@vendor.com", "password": "password"})
    assert sup_login.status_code == 200
    sup_token = sup_login.json()["access_token"]
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    assert sup_login.json()["user"]["role"] == "supplier"

    # -------------------------------------------------------------
    # Step 8: Open RMA Kanban Board & Advance Stage
    # -------------------------------------------------------------
    # Advance to In Review
    patch1 = client.patch(
        f"/api/v1/rma/tickets/{ticket_id}",
        json={"status": "In Review", "comment": "Assigned to QA triage team"},
        headers=sup_headers
    )
    assert patch1.status_code == 200
    assert patch1.json()["status"] == "In Review"

    # Advance to Approved
    patch2 = client.patch(
        f"/api/v1/rma/tickets/{ticket_id}",
        json={"status": "Approved", "comment": "Replacement authorized from Chicago warehouse"},
        headers=sup_headers
    )
    assert patch2.status_code == 200
    assert patch2.json()["status"] == "Approved"

    # -------------------------------------------------------------
    # Step 9: Create new wholesale order for STORE-001 & generate QR
    # -------------------------------------------------------------
    new_ord_payload = {
        "store_client_id": "STORE-001",
        "carrier": "FedEx Priority Express",
        "items": [{
            "sku": "SKU-WAT-01",
            "name": "Apex Pulse Pro Watch",
            "quantity": 50,
            "unit_cost": 45.0,
            "total": 2250.0
        }]
    }
    create_ord_resp = client.post("/api/v1/orders", json=new_ord_payload, headers=sup_headers)
    assert create_ord_resp.status_code == 201
    ord_data = create_ord_resp.json()["order"]
    tracking_hash = ord_data["qr_tracking_hash"]
    assert len(tracking_hash) == 16 # 16-character HMAC-SHA256 hex digest
    assert "qr" in create_ord_resp.json()
    assert create_ord_resp.json()["qr"]["qr_image_data_uri"].startswith("data:image/png;base64,")

    # -------------------------------------------------------------
    # Step 10: Public Tracking Endpoint (Zero Auth Header)
    # -------------------------------------------------------------
    track_resp = client.get(f"/api/v1/orders/track/{tracking_hash}")
    assert track_resp.status_code == 200
    track_info = track_resp.json()
    assert track_info["order_id"] == ord_data["order_id"]
    assert track_info["carrier"] == "FedEx Priority Express"
    # Verify strict redaction: zero cost or margin exposed publicly
    assert "unit_cost" not in track_info
    assert "gross_margin" not in track_info
    assert "total_cost" not in track_info

    # -------------------------------------------------------------
    # Step 11: Export Executive PDF & XLSX Reports
    # -------------------------------------------------------------
    pdf_resp = client.get("/api/v1/reports/export?format=pdf&store_id=STORE-001", headers=sup_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert pdf_resp.content.startswith(b"%PDF")

    xlsx_resp = client.get("/api/v1/reports/export?format=xlsx&store_id=STORE-001", headers=sup_headers)
    assert xlsx_resp.status_code == 200
    assert "spreadsheetml" in xlsx_resp.headers["content-type"]

    # -------------------------------------------------------------
    # Step 12: Cross-Tenant Isolation Enforcement Verification
    # Client 2 (STORE-002) MUST NEVER see STORE-001 orders
    # -------------------------------------------------------------
    c2_login = client.post("/api/v1/auth/login", json={"email": "client2@store.com", "password": "password"})
    c2_token = c2_login.json()["access_token"]
    c2_headers = {"Authorization": f"Bearer {c2_token}"}
    assert c2_login.json()["user"]["store_client_id"] == "STORE-002"

    c2_orders_resp = client.get("/api/v1/client/orders", headers=c2_headers)
    assert c2_orders_resp.status_code == 200
    c2_orders = c2_orders_resp.json()["orders"]
    for o in c2_orders:
        assert o["store_client_id"] == "STORE-002"
        assert o["store_client_id"] != "STORE-001"
