"""
QR Code Generation and Supply Chain Tracking Service
Generates cryptographic QR images encoding public tracking links.
Validates HMAC-SHA256 tracking hashes and retrieves public milestone info
with strict data redaction (zero customer or pricing exposure).
"""

import io
import base64
import hmac
import hashlib
from typing import Dict, Any, Optional
import qrcode
from qrcode.image.pil import PilImage

from app.core.config import settings
from app.services.db import db_service

def verify_tracking_hash(order_id: str, store_id: str, date_str: str, provided_hash: str) -> bool:
    """Verifies whether the provided hash matches the expected HMAC-SHA256 signature."""
    msg = f"{order_id}:{store_id}:{date_str}".encode("utf-8")
    expected = hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()[:16].upper()
    return hmac.compare_digest(expected, provided_hash.upper())

def generate_qr_data_uri(content: str) -> str:
    """Renders QR code and returns as Base64 Data URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(content)
    qr.make(fit=True)

    img: PilImage = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def generate_order_qr(order_id: str, tracking_hash: str) -> Dict[str, Any]:
    tracking_url = f"/track/{tracking_hash}"
    data_uri = generate_qr_data_uri(f"https://predictivevendorml.local/track/{tracking_hash}")
    return {
        "order_id": order_id,
        "qr_tracking_hash": tracking_hash,
        "tracking_url": tracking_url,
        "qr_image_data_uri": data_uri
    }

def get_public_tracking_info(tracking_hash: str) -> Optional[Dict[str, Any]]:
    """
    Returns public-safe tracking view.
    Zero customer details, unit prices, or financial margins exposed.
    """
    order = db_service.orders.find_one({"qr_tracking_hash": tracking_hash.upper()})
    if not order:
        return None

    # Redact all sensitive fields
    return {
        "order_id": order.get("order_id"),
        "status": order.get("status"),
        "carrier": order.get("carrier", "Standard Freight"),
        "tracking_number": order.get("tracking_number", "TRK-PENDING"),
        "origin": order.get("origin", "Central Logistics Terminal"),
        "destination": order.get("destination", "Regional Retail Facility"),
        "item_count": sum(item.get("quantity", 0) for item in order.get("items", [])),
        "timeline": order.get("timeline", []),
        "last_updated": order.get("timeline", [{}])[-1].get("timestamp") if order.get("timeline") else order.get("created_at")
    }
