"""
Pytest configuration and test client fixtures using FastAPI TestClient.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
settings.ENVIRONMENT = "test"
from app.main import app
from app.core.security import create_access_token

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(scope="session")
def client_token():
    return create_access_token({
        "uid": "usr_client_001",
        "email": "client1@store.com",
        "role": "client",
        "store_client_id": "STORE-001",
        "display_name": "Marcus Vance"
    })

@pytest.fixture(scope="session")
def client2_token():
    return create_access_token({
        "uid": "usr_client_002",
        "email": "client2@store.com",
        "role": "client",
        "store_client_id": "STORE-002",
        "display_name": "Elena Rostova"
    })

@pytest.fixture(scope="session")
def supplier_token():
    return create_access_token({
        "uid": "usr_supplier_001",
        "email": "supplier@vendor.com",
        "role": "supplier",
        "store_client_id": None,
        "display_name": "David Sterling"
    })
