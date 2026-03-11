from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from base.database import Base
import enum


class UserRole(str, enum.Enum):
    cashier = "cashier"
    admin = "admin"
    superadmin = "superadmin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(30), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.cashier, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
