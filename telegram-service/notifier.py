import httpx
import os

TELEGRAM_SERVICE = os.getenv("TELEGRAM_SERVICE_URL", "http://telegram-service:8002")

async def _post(path: str, data: dict):
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            await client.post(f"{TELEGRAM_SERVICE}{path}", json=data)
    except Exception as e:
        print(f"[TELEGRAM NOTIFY ERROR] {path}: {e}")

async def notify_order(order_id, total_usd, items, payment, staff="POS"):
    await _post("/notify/order", {"order_id": order_id, "total_usd": total_usd, "items": items, "payment_method": payment, "staff": staff})

async def notify_low_stock(variant_name, product_name, stock_qty, min_stock_qty):
    await _post("/notify/low-stock", {"variant_name": variant_name, "product_name": product_name, "stock_qty": stock_qty, "min_stock_qty": min_stock_qty})

async def notify_user_registered(email, full_name, role):
    await _post("/notify/user-registered", {"email": email, "full_name": full_name, "role": role})

async def notify_user_login(email, full_name, role):
    await _post("/notify/user-login", {"email": email, "full_name": full_name, "role": role})

async def notify_error(service, error, endpoint=""):
    await _post("/notify/error", {"service": service, "error": str(error), "endpoint": endpoint})
