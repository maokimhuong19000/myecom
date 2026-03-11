from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from base.database import get_db
from base.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user
)
from base.common import success_response, error_response
from models.user import User

router = APIRouter(tags=["Auth"])


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "cashier"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ---------- Endpoints ----------

@router.post("/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=payload.role or "cashier",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    tokens = _issue_tokens(user)
    return success_response(data={**_user_dict(user), **tokens}, message="Registration successful")


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    tokens = _issue_tokens(user)
    return success_response(data={**_user_dict(user), **tokens}, message="Login successful")


@router.post("/refresh")
def refresh_token(payload: RefreshRequest):
    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    access_token = create_access_token({"sub": decoded["sub"], "role": decoded.get("role")})
    return success_response(data={"access_token": access_token})


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return success_response(data=_user_dict(current_user))


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return success_response(message="Password updated successfully")


@router.post("/verify-token")
def verify_token_endpoint(current_user: User = Depends(get_current_user)):
    """Internal endpoint for other services to validate a token."""
    return success_response(data=_user_dict(current_user))


# ---------- Helpers ----------

def _issue_tokens(user: User) -> dict:
    payload = {"sub": str(user.id), "role": user.role}  # str(user.id) ← key fix
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": str(user.created_at),
    }
