from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "admin" | "assistant"
    pin_hash = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    lab = Column(String, nullable=False)
    presentation = Column(String, nullable=False)
    visual_description = Column(Text, nullable=False)
    purchase_price = Column(Float, nullable=False)
    sale_price = Column(Float, nullable=False)
    current_stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=1)
    barcode = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InventoryScan(Base):
    __tablename__ = "inventory_scans"
    id = Column(Integer, primary_key=True, index=True)
    photo_filename = Column(String, nullable=False)
    scanned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending_review")  # "pending_review" | "confirmed" | "rejected"
    ai_raw_response = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    details = relationship("ScanDetail", back_populates="scan")


class ScanDetail(Base):
    __tablename__ = "scan_details"
    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("inventory_scans.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    ai_detected_name = Column(String, nullable=False)
    ai_count = Column(Integer, nullable=False)
    ai_confidence = Column(Float, nullable=False)
    final_count = Column(Integer, nullable=False)
    user_corrected = Column(Boolean, default=False)
    previous_stock = Column(Integer, default=0)
    difference = Column(Integer, default=0)
    scan = relationship("InventoryScan", back_populates="details")


class Movement(Base):
    __tablename__ = "movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String, nullable=False)  # "sale" | "purchase" | "adjustment" | "scan_update"
    quantity = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
