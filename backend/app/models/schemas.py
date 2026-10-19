"""
Pydantic v2 Validation Schemas
Enforces constraints on quantities, prices, statuses, and payloads.
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr

class UserRole(str, Enum):
    CLIENT = "client"
    SUPPLIER = "supplier"

class OrderStatus(str, Enum):
    MANUFACTURED = "Manufactured"
    DISPATCHED = "Dispatched"
    IN_TRANSIT = "In-Transit"
    DELIVERED = "Delivered"
    CANCELLED = "Cancelled"

class RMATicketStatus(str, Enum):
    OPEN = "Open"
    IN_REVIEW = "In Review"
    APPROVED = "Approved"
    REPLACED = "Replaced"
    REFUNDED = "Refunded"
    REJECTED = "Rejected"
    CLOSED = "Closed"

class DefectType(str, Enum):
    TRANSIT_DAMAGE = "Transit Damage"
    MANUFACTURER_DEFECT = "Manufacturer Defect"
    DEAD_ON_ARRIVAL = "Dead-on-Arrival"
    THEFT_SHRINKAGE = "Theft/Shrinkage"
    EXPIRED_PROMOTION = "Expired Promotion"
    INCORRECT_SPEC = "Incorrect Specification"
    OTHER = "Other"

# Auth Schemas
class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    firebase_id_token: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    role: str = "client"
    display_name: Optional[str] = None
    store_client_id: Optional[str] = None
    store_name: Optional[str] = None
    firebase_id_token: Optional[str] = None

class UserProfile(BaseModel):
    uid: str
    email: str
    role: str
    store_client_id: Optional[str] = None
    display_name: str
    store_name: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# ML Prediction Schemas
class RestockPredictRequest(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    store_client_id: Optional[str] = None  # Ignored for client role (overridden by verified claim)
    price_override: Optional[float] = Field(None, ge=0.01, le=10000.0)
    lead_time_override: Optional[int] = Field(None, ge=1, le=120)
    promo_override: Optional[int] = Field(None, ge=0, le=1)

class DailyForecastPoint(BaseModel):
    date: str
    day_offset: int
    predicted_demand: float
    demand_lower: float
    demand_upper: float
    projected_stock: float

class RestockPredictResponse(BaseModel):
    store_client_id: str
    sku: str
    product_name: str
    product_category: str
    current_stock: int
    unit_price: float
    lead_time_days: int
    promo_active: bool
    daily_velocity: float
    days_to_stockout: float
    projected_stockout_date: Optional[str] = None
    risk_level: str
    safety_stock: int
    forecast_7d: float
    forecast_14d: float
    forecast_30d: float
    recommended_qty: int
    daily_forecast: List[DailyForecastPoint]
    historical_trajectory: List[Dict[str, Any]]
    model_version: str
    evaluated_at: str

# Order Schemas
class OrderItem(BaseModel):
    sku: str
    name: str
    quantity: int = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    total: float = Field(..., ge=0)

class CreateOrderRequest(BaseModel):
    store_client_id: str
    items: List[OrderItem] = Field(..., min_length=1)
    carrier: Optional[str] = "FedEx Freight Express"
    destination: Optional[str] = None

class UpdateOrderStatusRequest(BaseModel):
    status: OrderStatus
    location: str = "Regional Logistics Facility"
    actor: Optional[str] = "Wholesale Operations"
    notes: Optional[str] = None

# RMA Schemas
class CreateRMATicketRequest(BaseModel):
    order_id: str = Field(..., min_length=3)
    sku: str = Field(..., min_length=3)
    defect_type: DefectType
    description: str = Field(..., min_length=10, max_length=2000)
    quantity: int = Field(default=1, gt=0)
    image_url: Optional[str] = None

class UpdateRMATicketStatusRequest(BaseModel):
    status: RMATicketStatus
    comment: str = Field(..., min_length=3)
    actor: Optional[str] = "Supplier Support Desk"

# Smart Purchase Order Schemas (Extension)
class CreatePurchaseOrderRequest(BaseModel):
    sku: str
    quantity: int = Field(..., gt=0)
    urgency: str = "Normal"  # Normal, High, Urgent
    notes: Optional[str] = None

# Error Response
class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: Optional[str] = None
