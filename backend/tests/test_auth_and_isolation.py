def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
    assert data["ml_engine"]["ready"] is True

def test_demo_login(client):
    res = client.post("/api/v1/auth/login", json={"email": "client1@store.com"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "client"
    assert data["user"]["store_client_id"] == "STORE-001"

def test_client_cannot_access_supplier_routes(client, client_token):
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/supplier/sales-summary", headers=headers)
    assert res.status_code == 403
    err = res.json()
    assert err["code"] == "FORBIDDEN"

def test_supplier_can_access_supplier_routes(client, supplier_token):
    headers = {"Authorization": f"Bearer {supplier_token}"}
    res = client.get("/api/v1/supplier/sales-summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_revenue" in data
    assert data["active_partner_stores"] > 0

def test_client_orders_tenant_isolation(client, client_token, client2_token):
    # Client 1 queries own orders
    headers1 = {"Authorization": f"Bearer {client_token}"}
    res1 = client.get("/api/v1/client/orders", headers=headers1)
    assert res1.status_code == 200
    orders1 = res1.json()["orders"]
    for o in orders1:
        assert o["store_client_id"] == "STORE-001"

    # Client 2 queries own orders
    headers2 = {"Authorization": f"Bearer {client2_token}"}
    res2 = client.get("/api/v1/client/orders", headers=headers2)
    assert res2.status_code == 200
    orders2 = res2.json()["orders"]
    for o in orders2:
        assert o["store_client_id"] == "STORE-002"

def test_cross_tenant_direct_order_access_forbidden(client, client_token):
    # ORD-7002 belongs to STORE-002; Client 1 (STORE-001) attempts to inspect it
    headers = {"Authorization": f"Bearer {client_token}"}
    res = client.get("/api/v1/orders/ORD-7002", headers=headers)
    assert res.status_code == 403
    assert res.json()["code"] == "FORBIDDEN"

def test_public_track_order_redaction(client):
    from app.services.db import db_service
    order = db_service.orders.find_one({})
    assert order is not None
    h = order["qr_tracking_hash"]

    res = client.get(f"/api/v1/track/{h}")
    assert res.status_code == 200
    track_info = res.json()
    # Confirm public information is present
    assert "status" in track_info
    assert "timeline" in track_info
    assert "carrier" in track_info
    # Confirm confidential commercial information is completely redacted
    assert "total_amount" not in track_info
    assert "unit_cost" not in track_info
    assert "owner_email" not in track_info
    assert "store_name" not in track_info

def test_invalid_tracking_hash_returns_404(client):
    res = client.get("/api/v1/track/INVALID_HASH_1234")
    assert res.status_code == 404
    assert res.json()["code"] == "INVALID_HASH"

def test_invalid_demo_password_rejected(client):
    res = client.post("/api/v1/auth/login", json={"email": "client1@store.com", "password": "wrong_password_xyz"})
    assert res.status_code == 401

def test_unregistered_email_rejected(client):
    res = client.post("/api/v1/auth/login", json={"email": "nonexistent_user_99@store.com", "password": "demo1234"})
    assert res.status_code == 401

def test_custom_user_register_and_login_lifecycle(client):
    email = "new_manager_test@flagship.com"
    pwd = "SecureManagerPass2026!"
    # 1. Register new store manager
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": pwd,
        "role": "client",
        "display_name": "Test Manager",
        "store_client_id": "STORE-001"
    })
    assert reg_res.status_code == 201
    assert "access_token" in reg_res.json()

    # 2. Login with correct password
    login_ok = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    assert login_ok.status_code == 200
    assert "access_token" in login_ok.json()

    # 3. Login with incorrect password must be rejected
    login_bad = client.post("/api/v1/auth/login", json={"email": email, "password": "wrong_password"})
    assert login_bad.status_code == 401

