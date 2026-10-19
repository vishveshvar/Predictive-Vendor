"""
Set Firebase Custom Claims Script
Sets role ('client' or 'supplier') and 'store_client_id' on Firebase Auth user accounts.
Usage:
    python set_custom_claims.py <email_or_uid> --role client --store STORE-001
    python set_custom_claims.py <email_or_uid> --role supplier
"""

import os
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings

def set_claims(user_identifier: str, role: str, store_client_id: str | None = None):
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if not cred_path or not os.path.exists(cred_path):
        print(f"[Notice] Firebase credentials not configured at '{cred_path}'.")
        print(f"[Simulated Claim Update] Identifier: {user_identifier}, Role: {role}, Store: {store_client_id}")
        return True

    import firebase_admin
    from firebase_admin import auth, credentials

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    try:
        if "@" in user_identifier:
            user = auth.get_user_by_email(user_identifier)
            uid = user.uid
        else:
            uid = user_identifier

        claims = {"role": role}
        if store_client_id:
            claims["store_client_id"] = store_client_id

        auth.set_custom_user_claims(uid, claims)
        print(f"[Success] Set claims on UID {uid}: {claims}")
        return True
    except Exception as e:
        print(f"[Error] Failed to set claims: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Assign Firebase Custom Claims")
    parser.add_argument("identifier", help="User UID or Email")
    parser.add_argument("--role", choices=["client", "supplier"], required=True, help="User Role")
    parser.add_argument("--store", help="Store Client ID (for client role)")
    args = parser.parse_args()

    set_claims(args.identifier, args.role, args.store)

if __name__ == "__main__":
    main()
