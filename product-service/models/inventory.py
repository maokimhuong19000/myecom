from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from base.database import Base


class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=False)
    change_qty = Column(Integer, nullable=False)     # positive = in, negative = out
    note = Column(Text, nullable=False)              # audit note required
    created_by = Column(Integer, nullable=True)      # user_id from auth service
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    variant = relationship("ProductVariant", back_populates="inventory_logs")
