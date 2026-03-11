from fastapi import APIRouter
from application.api.product_controller import router as product_router
from application.api.inventory_controller import router as inventory_router
from application.api.order_controller import router as order_router
from application.api.analytics_controller import router as analytics_router

router = APIRouter()
router.include_router(product_router, prefix="/catalog")
router.include_router(inventory_router, prefix="/inventory")
router.include_router(order_router, prefix="/orders")
router.include_router(analytics_router, prefix="/analytics")
