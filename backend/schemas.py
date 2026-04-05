from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Auth
class LoginRequest(BaseModel):
    pin: Optional[str] = None
    password: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    user_role: str


# Products
class ProductBase(BaseModel):
    name: str
    lab: str
    presentation: str
    visual_description: str
    purchase_price: float
    sale_price: float
    current_stock: int = 0
    min_stock: int = 1
    barcode: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    lab: Optional[str] = None
    presentation: Optional[str] = None
    visual_description: Optional[str] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    current_stock: Optional[int] = None
    min_stock: Optional[int] = None
    barcode: Optional[str] = None
    active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Scans
class ScanDetailResponse(BaseModel):
    id: int
    scan_id: int
    product_id: Optional[int]
    ai_detected_name: str
    ai_count: int
    ai_confidence: float
    final_count: int
    user_corrected: bool
    previous_stock: int
    difference: int

    class Config:
        from_attributes = True


class ScanResponse(BaseModel):
    id: int
    photo_filename: str
    scanned_by: int
    scanned_at: datetime
    status: str
    ai_raw_response: Optional[str]
    notes: Optional[str]
    confirmed_by: Optional[int]
    confirmed_at: Optional[datetime]
    details: List[ScanDetailResponse] = []

    class Config:
        from_attributes = True


class UpdateDetailRequest(BaseModel):
    final_count: int


class ConfirmScanRequest(BaseModel):
    notes: Optional[str] = None


# Movements
class MovementCreate(BaseModel):
    product_id: int
    movement_type: str  # "sale" | "purchase" | "adjustment"
    quantity: int
    note: Optional[str] = None


class MovementResponse(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: int
    note: Optional[str]
    created_by: int
    approved_by: Optional[int]
    approved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard
class DashboardResponse(BaseModel):
    total_products: int
    low_stock_count: int
    pending_scans: int
    products_summary: List[dict]
    recent_movements: List[dict]
    low_stock_alerts: List[dict]
