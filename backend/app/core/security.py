"""
Security, Authentication, and RBAC Dependencies
Supports dual-mode verification:
1. Firebase ID token validation via firebase_admin.auth (when configured)
2. Standalone HS256 signed JWT tokens (for local dev, offline runs, and automated tests)
Enforces multi-tenant isolation by extracting verified claims (role, store_client_id).
"""

import os
import time
import logging
import hashlib
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.config import settings

logger = logging.getLogger("app.security")
security_bearer = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Deterministic salted SHA-256 hash for demo accounts."""
    salt = settings.SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Authentication token has expired"}
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Could not validate authentication credentials"}
        )

def _init_firebase_admin():
    import firebase_admin
    from firebase_admin import credentials
    if not firebase_admin._apps:
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        local_service_account = os.path.join(backend_dir, "service_account.json")

        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        elif os.path.exists(local_service_account):
            cred = credentials.Certificate(local_service_account)
            firebase_admin.initialize_app(cred)
        elif os.path.exists("service_account.json"):
            cred = credentials.Certificate("service_account.json")
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})

def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """Attempts Firebase Admin verification using firebase-admin SDK and syncs with MongoDB."""
    if not id_token or len(id_token.split(".")) != 3:
        return None

    try:
        # Fast pre-check: Firebase ID tokens always use RS256 algorithm and contain a 'kid'
        header = jwt.get_unverified_header(id_token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            return None
    except Exception:
        return None

    try:
        import firebase_admin
        from firebase_admin import auth
        _init_firebase_admin()

        decoded = auth.verify_id_token(id_token)
        uid = decoded.get("uid")
        email = decoded.get("email", "").lower().strip()

        # Look up synced persistent database record in MongoDB
        from app.services.db import db_service
        query = []
        if uid:
            query.append({"uid": uid})
            query.append({"firebase_uid": uid})
        if email:
            query.append({"email": email})

        db_user = db_service.users.find_one({"$or": query}) if query else None

        role = decoded.get("role") or (db_user.get("role") if db_user else "client")
        store_client_id = decoded.get("store_client_id") or (db_user.get("store_client_id") if db_user else ("STORE-001" if role == "client" else None))
        display_name = decoded.get("name") or (db_user.get("display_name") if db_user else (email.split("@")[0].title() if email else "User"))
        store_name = db_user.get("store_name") if db_user else None

        # Auto-sync to MongoDB if user record is missing in MongoDB
        if not db_user and uid and email:
            sync_doc = {
                "uid": uid,
                "firebase_uid": uid,
                "email": email,
                "role": role,
                "store_client_id": store_client_id,
                "display_name": display_name,
                "store_name": store_name,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            try:
                db_service.users.insert_one(sync_doc)
            except Exception as sync_err:
                logger.debug(f"User sync to mongo notice: {sync_err}")
        elif db_user and uid and not db_user.get("firebase_uid"):
            try:
                db_service.users.update_one({"_id": db_user["_id"]}, {"$set": {"firebase_uid": uid}})
            except Exception:
                pass

        return {
            "uid": uid,
            "email": email,
            "role": role,
            "store_client_id": store_client_id,
            "display_name": display_name,
            "store_name": store_name
        }
    except Exception as e:
        logger.warning(f"Firebase token verification failed or skipped: {e}")
        return None

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing Bearer authorization header"}
        )

    token = credentials.credentials

    # 1. Try Firebase Admin verification
    fb_user = verify_firebase_token(token)
    if fb_user:
        request.state.user = fb_user
        return fb_user

    # 2. Try HS256 JWT decoding
    payload = decode_token(token)
    user_data = {
        "uid": payload.get("uid"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "store_client_id": payload.get("store_client_id"),
        "display_name": payload.get("display_name", payload.get("email"))
    }
    request.state.user = user_data
    return user_data

def require_role(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) Dependency.
    Verifies that the authenticated user possesses one of the allowed roles.
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            logger.warning(f"Forbidden access: User {current_user.get('email')} with role '{user_role}' attempted to access route requiring {allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Operation not permitted. Required role: {allowed_roles}, your role: '{user_role}'"
                }
            )
        return current_user
    return role_checker
