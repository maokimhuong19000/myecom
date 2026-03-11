from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from base.database import Base
import enum


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    khqr = "khqr"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    total_usd = Column(Numeric(10, 2), nullable=False)
    total_khr = Column(Numeric(15, 2), nullable=True)
    exchange_rate = Column(Numeric(10, 2), nullable=True)   # KHR per 1 USD at sale time
    payment_method = Column(String(10), nullable=False, default="cash")
    cash_tendered = Column(Numeric(10, 2), nullable=True)   # for change calculation
    change_usd = Column(Numeric(10, 2), nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)     # sale price at time of order
    unit_cost = Column(Numeric(10, 2), nullable=False)      # cost price at time of order

    order = relationship("Order", back_populates="items")
    variant = relationship("ProductVariant", back_populates="order_items")
