import uuid
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Request, Body
from fastapi.security import HTTPAuthorizationCredentials
from datetime import datetime, timezone

from app.models.schemas import LoginRequest, LoginResponse, UserProfile, RegisterRequest
from app.core.security import (
    create_access_token, 
    get_current_user, 
    verify_firebase_token, 
    decode_token, 
    security_bearer, 
    _init_firebase_admin
)
from app.services.db import db_service
from app.core.audit import log_audit

logger = logging.getLogger("app.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    payload: Optional[LoginRequest] = Body(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    try:
        # Step 1: Extract token from Authorization: Bearer <token> header (or payload fallback)
        token = None
        if credentials and credentials.credentials:
            token = credentials.credentials
        elif request.headers.get("Authorization"):
            auth_hdr = request.headers.get("Authorization")
            if auth_hdr.startswith("Bearer "):
                token = auth_hdr.split("Bearer ", 1)[1].strip()
        elif payload and payload.firebase_id_token:
            token = payload.firebase_id_token

        # Step 2 & 3: Token Verification via Firebase Admin
        if token:
            try:
                import firebase_admin
                from firebase_admin import auth as fb_auth
                _init_firebase_admin()
                decoded_token = fb_auth.verify_id_token(token)
                uid = decoded_token.get("uid")
                email = decoded_token.get("email", "").lower().strip()
            except fb_auth.ExpiredIdTokenError:
                raise HTTPException(status_code=401, detail="Authentication session expired")
            except fb_auth.InvalidIdTokenError:
                # Check for internal JWT (e.g. HS256 demo/testing token)
                try:
                    local_payload = decode_token(token)
                    uid = local_payload.get("uid")
                    email = local_payload.get("email", "").lower().strip()
                    decoded_token = local_payload
                except Exception:
                    raise HTTPException(status_code=401, detail="Invalid authentication token")
            except Exception as fb_err:
                logger.warning(f"Firebase token verification notice: {fb_err}")
                try:
                    local_payload = decode_token(token)
                    uid = local_payload.get("uid")
                    email = local_payload.get("email", "").lower().strip()
                    decoded_token = local_payload
                except Exception:
                    raise HTTPException(status_code=401, detail="Invalid authentication token")

            # Step 4: Query MongoDB users collection using extracted uid (or fallback to email)
            query = []
            if uid:
                query.append({"uid": uid})
                query.append({"firebase_uid": uid})
            if email:
                query.append({"email": email})

            user = db_service.users.find_one({"$or": query}) if query else None

            # Step 5: Provision user dynamically in MongoDB if missing
            if not user:
                default_role = "supplier" if ("supplier" in email or "vendor" in email) else "client"
                default_store = None if default_role == "supplier" else "STORE-001"
                display_name = decoded_token.get("name") or (email.split("@")[0].title() if email else "User")
                user = {
                    "uid": uid or f"usr_{uuid.uuid4().hex[:12]}",
                    "firebase_uid": uid,
                    "email": email,
                    "role": default_role,
                    "store_client_id": default_store,
                    "display_name": display_name,
                    "store_name": "Apex Electronics Metro Flagship" if default_role == "client" else "Global Wholesale Distribution",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                try:
                    db_service.users.insert_one(user)
                except Exception as insert_err:
                    logger.warning(f"Error provisioning user in MongoDB: {insert_err}")
            elif uid and not user.get("firebase_uid"):
                try:
                    db_service.users.update_one({"_id": user["_id"]}, {"$set": {"firebase_uid": uid}})
                except Exception:
                    pass

            role = user.get("role", "client")
            store_client_id = user.get("store_client_id")
            display_name = user.get("display_name", email)
            store_name = user.get("store_name")

            token_data = {
                "uid": user.get("uid", uid),
                "email": user["email"],
                "role": role,
                "store_client_id": store_client_id,
                "display_name": display_name
            }
            access_token = create_access_token(token_data)
            log_audit(user.get("uid", uid), role, "LOGIN", "auth/login", details={"method": "bearer_token", "email": email})

            return LoginResponse(
                access_token=access_token,
                user=UserProfile(
                    uid=user.get("uid", uid),
                    email=user["email"],
                    role=role,
                    store_client_id=store_client_id,
                    display_name=display_name,
                    store_name=store_name
                )
            )

        # Fallback: JSON body email/password demo authentication when no Authorization header was provided
        if not payload or not payload.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing authentication credentials"
            )

        email_clean = payload.email.lower().strip()
        user = db_service.users.find_one({"email": email_clean})

        if not user:
            # Check demo user presets
            if "client1" in email_clean:
                user = {
                    "uid": "usr_client_001",
                    "email": "client1@store.com",
                    "role": "client",
                    "store_client_id": "STORE-001",
                    "display_name": "Marcus Vance",
                    "store_name": "Apex Electronics Metro Flagship"
                }
            elif "client2" in email_clean:
                user = {
                    "uid": "usr_client_002",
                    "email": "client2@store.com",
                    "role": "client",
                    "store_client_id": "STORE-002",
                    "display_name": "Elena Rostova",
                    "store_name": "TechHaven Downtown Hub"
                }
            elif "supplier" in email_clean:
                user = {
                    "uid": "usr_supplier_001",
                    "email": "supplier@vendor.com",
                    "role": "supplier",
                    "store_client_id": None,
                    "display_name": "David Sterling",
                    "store_name": "Global Wholesale Distribution"
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User with this email not registered"
                )

        token_data = {
            "uid": user["uid"],
            "email": user["email"],
            "role": user["role"],
            "store_client_id": user.get("store_client_id"),
            "display_name": user.get("display_name", user["email"])
        }
        token = create_access_token(token_data)

        log_audit(user["uid"], user["role"], "LOGIN", "auth/login", details={"email": user["email"]})

        return LoginResponse(
            access_token=token,
            user=UserProfile(
                uid=user["uid"],
                email=user["email"],
                role=user["role"],
                store_client_id=user.get("store_client_id"),
                display_name=user.get("display_name", user["email"]),
                store_name=user.get("store_name")
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed due to server error: {str(exc)}"
        )

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(
    request: Request,
    payload: RegisterRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
):
    try:
        # Extract token from header or payload
        token = None
        if credentials and credentials.credentials:
            token = credentials.credentials
        elif request.headers.get("Authorization"):
            auth_hdr = request.headers.get("Authorization")
            if auth_hdr.startswith("Bearer "):
                token = auth_hdr.split("Bearer ", 1)[1].strip()
        elif payload.firebase_id_token:
            token = payload.firebase_id_token

        email_clean = payload.email.lower().strip()
        uid = f"usr_{uuid.uuid4().hex[:12]}"
        firebase_uid = None

        # 1. If Firebase ID token is provided, verify it
        if token:
            fb_user = verify_firebase_token(token)
            if fb_user and fb_user.get("uid"):
                uid = fb_user["uid"]
                firebase_uid = fb_user["uid"]

        # 2. Check if user already exists in MongoDB
        query = [{"email": email_clean}]
        if firebase_uid:
            query.append({"firebase_uid": firebase_uid})
            query.append({"uid": firebase_uid})

        existing_user = db_service.users.find_one({"$or": query})
        if existing_user:
            # Sync / update fields
            role = payload.role if payload.role in ["client", "supplier"] else existing_user.get("role", "client")
            store_id = payload.store_client_id or existing_user.get("store_client_id")
            display_name = payload.display_name or existing_user.get("display_name", email_clean.split("@")[0].title())
            store_name = payload.store_name or existing_user.get("store_name")

            update_fields = {
                "role": role,
                "store_client_id": store_id if role == "client" else None,
                "display_name": display_name,
                "store_name": store_name
            }
            if firebase_uid:
                update_fields["firebase_uid"] = firebase_uid
            if not existing_user.get("uid"):
                update_fields["uid"] = uid

            db_service.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": update_fields}
            )
            user_data = db_service.users.find_one({"_id": existing_user["_id"]}, {"_id": 0})
        else:
            role = payload.role if payload.role in ["client", "supplier"] else "client"
            store_id = payload.store_client_id if role == "client" else None
            if role == "client" and not store_id:
                store_id = "STORE-001"
            
            store_name = payload.store_name
            if not store_name and store_id:
                st = db_service.stores.find_one({"store_client_id": store_id})
                store_name = st["name"] if st else store_id

            display_name = payload.display_name or email_clean.split("@")[0].title()

            user_data = {
                "uid": uid,
                "firebase_uid": firebase_uid or uid,
                "email": email_clean,
                "role": role,
                "store_client_id": store_id,
                "display_name": display_name,
                "store_name": store_name,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db_service.users.insert_one(user_data)
            user_data.pop("_id", None)

        token = create_access_token(user_data)
        log_audit(user_data["uid"], user_data["role"], "REGISTER", "auth/register", details={"email": email_clean, "role": user_data["role"]})

        return LoginResponse(
            access_token=token,
            user=UserProfile(**user_data)
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed due to server error: {str(exc)}"
        )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(user: dict = Depends(get_current_user)):
    db_user = db_service.users.find_one({"uid": user["uid"]})
    store_name = None
    if user.get("store_client_id"):
        store = db_service.stores.find_one({"store_client_id": user["store_client_id"]})
        store_name = store["name"] if store else None

    return UserProfile(
        uid=user["uid"],
        email=user["email"],
        role=user["role"],
        store_client_id=user.get("store_client_id"),
        display_name=user.get("display_name", user["email"]),
        store_name=store_name or (db_user.get("store_name") if db_user else None)
    )
