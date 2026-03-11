from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from base.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    barcode = Column(String(100), unique=True, nullable=True, index=True)
    image_url = Column(String(500), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String(100), nullable=False)      # "Large", "Mango", "500ml"
    sku = Column(String(100), unique=True, nullable=True, index=True)
    sale_price = Column(Numeric(10, 2), nullable=False)
    stock_qty = Column(Integer, default=0)
    min_stock_qty = Column(Integer, default=5)       # alert threshold
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="variants")
    inventory_logs = relationship("InventoryLog", back_populates="variant")
    order_items = relationship("OrderItem", back_populates="variant")
