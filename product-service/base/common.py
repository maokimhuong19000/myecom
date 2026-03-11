from typing import Any, Optional
import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
bearer_scheme = HTTPBearer()


def success_response(data: Any = None, message: str = "Success") -> dict:
    return {"success": True, "message": message, "data": data}


def error_response(message: str = "Error") -> dict:
    return {"success": False, "message": message, "data": None}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return {"id": int(payload.get("sub")), "role": payload.get("role")}  # int() here
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
