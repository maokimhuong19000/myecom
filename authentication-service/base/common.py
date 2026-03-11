from pydantic import BaseModel
from typing import Any, Optional


class BaseResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


def success_response(data: Any = None, message: str = "Success") -> dict:
    return {"success": True, "message": message, "data": data}


def error_response(message: str = "Error", data: Any = None) -> dict:
    return {"success": False, "message": message, "data": data}
