"""
Demo Users Seed Script
Creates demo users for the multi-tenant system:
- Client 1: client1@store.com (Store: STORE-001)
- Client 2: client2@store.com (Store: STORE-002)
- Supplier: supplier@vendor.com (Wholesaler)

Supports both Firebase Admin SDK (when service account is present)
and local/in-memory user collection storage.
"""

import os
import sys
import json
import datetime
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings

DEMO_USERS = [
    {
        "uid": "usr_client_001",
        "email": "client1@store.com",
        "role": "client",
        "store_client_id": "STORE-001",
        "display_name": "Marcus Vance (Apex Flagship)",
        "password_hash": "demo_hash_client1",  # Plain password for mock auth: DemoClient123!
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    },
    {
        "uid": "usr_client_002",
        "email": "client2@store.com",
        "role": "client",
        "store_client_id": "STORE-002",
        "display_name": "Elena Rostova (TechHaven NY)",
        "password_hash": "demo_hash_client2",  # Plain password for mock auth: DemoClient123!
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    },
    {
        "uid": "usr_supplier_001",
        "email": "supplier@vendor.com",
        "role": "supplier",
        "store_client_id": None,
        "display_name": "David Sterling (Global Wholesale Ops)",
        "password_hash": "demo_hash_supplier",  # Plain password for mock auth: DemoSupplier123!
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
]

def seed_firebase_users():
    """Attempt Firebase Auth creation if credentials exist."""
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if not cred_path or not os.path.exists(cred_path):
        print("[Auth Seed] No Firebase credentials path detected. Skipping remote Firebase auth.")
        return False

    try:
        import firebase_admin
        from firebase_admin import auth, credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)

        for u in DEMO_USERS:
            try:
                user_record = auth.get_user_by_email(u["email"])
                print(f"[Firebase] User already exists: {u['email']} (uid: {user_record.uid})")
            except auth.UserNotFoundError:
                user_record = auth.create_user(
                    email=u["email"],
                    password="DemoPassword123!",
                    display_name=u["display_name"],
                    uid=u["uid"]
                )
                print(f"[Firebase] Created user: {u['email']}")

            # Set custom claims
            claims = {"role": u["role"]}
            if u["store_client_id"]:
                claims["store_client_id"] = u["store_client_id"]
            auth.set_custom_user_claims(user_record.uid, claims)
            print(f"[Firebase] Custom claims set for {u['email']}: {claims}")
        return True
    except Exception as e:
        print(f"[Firebase Seed Warning] Could not seed Firebase: {e}")
        return False

def get_demo_users_data():
    return DEMO_USERS

if __name__ == "__main__":
    print("Seeding demo users...")
    fb_success = seed_firebase_users()
    print("Demo Users Data prepared:")
    for user in DEMO_USERS:
        print(f"  - Email: {user['email']} | Role: {user['role']} | Store: {user.get('store_client_id')}")
