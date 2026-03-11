from fastapi import APIRouter
from application.api.auth_controller import router as auth_router
from application.api.user_controller import router as user_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(user_router)
