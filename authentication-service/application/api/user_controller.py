from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from base.database import get_db
from base.security import get_current_user, require_admin, hash_password
from base.common import success_response
from models.user import User

router = APIRouter(tags=["Users"])


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return success_response(data=[_user_dict(u) for u in users])


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Allow self-fetch or admin
    if current_user.id != user_id and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return success_response(data=_user_dict(user))


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in payload.dict(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return success_response(data=_user_dict(user), message="User updated")


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return success_response(message="User deactivated")


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
