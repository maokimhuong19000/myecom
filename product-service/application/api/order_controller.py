from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
import httpx, os
from base.database import get_db
from base.common import success_response, get_current_user
from models.product import ProductVariant
from models.order import Order, OrderItem
from models.inventory import InventoryLog

router = APIRouter(tags=["Orders"])

DEFAULT_EXCHANGE_RATE = 4100.0
TELEGRAM_SERVICE = os.getenv("TELEGRAM_SERVICE_URL", "http://telegram-service:8002")

async def _tg(path: str, data: dict):
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            await c.post(f"{TELEGRAM_SERVICE}{path}", json=data)
    except Exception as e:
        print(f"[TG] {path} failed: {e}")

class CartItem(BaseModel):
    variant_id: int
    qty: int

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    payment_method: str = "cash"
    cash_tendered_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_note: Optional[str] = None

@router.post("/checkout", status_code=201)
async def checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    rate = payload.exchange_rate or DEFAULT_EXCHANGE_RATE
    total_usd = 0.0
    order_items_data = []

    for item in payload.items:
        variant = db.query(ProductVariant).options(
            joinedload(ProductVariant.product)
        ).filter(ProductVariant.id == item.variant_id, ProductVariant.is_active == True).first()
        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} not found")
        if variant.stock_qty < item.qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{variant.product.name} - {variant.name}'. Available: {variant.stock_qty}")
        line_total = float(variant.sale_price) * item.qty
        total_usd += line_total
        order_items_data.append((variant, item.qty, float(variant.sale_price), float(variant.product.cost_price)))

    total_khr = round(total_usd * rate, 0)
    change_usd = None
    if payload.payment_method == "cash" and payload.cash_tendered_usd is not None:
        change_usd = round(payload.cash_tendered_usd - total_usd, 2)
        if change_usd < 0:
            raise HTTPException(status_code=400, detail="Cash tendered is less than total")

    order = Order(
        total_usd=round(total_usd, 2),
        total_khr=total_khr,
        exchange_rate=rate,
        payment_method=payload.payment_method,
        cash_tendered=payload.cash_tendered_usd,
        change_usd=change_usd,
        created_by=user.get("id"),
    )
    db.add(order)
    db.flush()

    total_items = 0
    for variant, qty, unit_price, unit_cost in order_items_data:
        db.add(OrderItem(
            order_id=order.id,
            variant_id=variant.id,
            qty=qty,
            unit_price=unit_price,
            unit_cost=unit_cost,
        ))
        variant.stock_qty -= qty
        total_items += qty
        db.add(InventoryLog(
            variant_id=variant.id,
            change_qty=-qty,
            note=f"Sold — Order #{order.id}",
            created_by=user.get("id"),
        ))
        if variant.stock_qty <= variant.min_stock_qty:
            await _tg("/notify/low-stock", {
                "variant_name": variant.name,
                "product_name": variant.product.name,
                "stock_qty": variant.stock_qty,
                "min_stock_qty": variant.min_stock_qty,
            })

    db.commit()
    db.refresh(order)

    # Build item detail lines for Telegram
    item_lines = "\n".join([
        f"  • {v.product.name} - {v.name} x{qty} @ ${up:.2f} = ${up*qty:.2f}"
        for v, qty, up, _ in order_items_data
    ])

    await _tg("/notify/order", {
        "order_id":       order.id,
        "total_usd":      float(order.total_usd),
        "total_khr":      int(order.total_khr),
        "items":          total_items,
        "payment_method": order.payment_method,
        "staff":          f"User #{user.get('id')}",
        "item_lines":     item_lines,
        "change_usd":     float(order.change_usd) if order.change_usd is not None else None,
        "customer_name":  payload.customer_name if hasattr(payload, 'customer_name') else "",
        "customer_phone": payload.customer_phone if hasattr(payload, 'customer_phone') else "",
        "customer_email": payload.customer_email if hasattr(payload, 'customer_email') else "",
        "customer_address": payload.customer_address if hasattr(payload, 'customer_address') else "",
        "customer_note":  payload.customer_note if hasattr(payload, 'customer_note') else "",
    })

    return success_response(
        data={
            "order_id":       order.id,
            "total_usd":      float(order.total_usd),
            "total_khr":      float(order.total_khr),
            "exchange_rate":  float(order.exchange_rate),
            "payment_method": order.payment_method,
            "change_usd":     float(order.change_usd) if order.change_usd is not None else None,
            "created_at":     str(order.created_at),
        },
        message="Order placed successfully"
    )

@router.get("")
def list_orders(limit: int = 50, db: Session = Depends(get_db), _=Depends(get_current_user)):
    orders = db.query(Order).options(joinedload(Order.items)).order_by(Order.created_at.desc()).limit(limit).all()
    return success_response(data=[_order_dict(o) for o in orders])

def _order_dict(o: Order) -> dict:
    return {
        "id": o.id,
        "total_usd": float(o.total_usd),
        "total_khr": float(o.total_khr) if o.total_khr else None,
        "payment_method": o.payment_method,
        "change_usd": float(o.change_usd) if o.change_usd else None,
        "created_at": str(o.created_at),
        "items": [
            {
                "variant_id": i.variant_id,
                "qty": i.qty,
                "unit_price": float(i.unit_price),
                "unit_cost": float(i.unit_cost),
                "line_total": float(i.unit_price) * i.qty,
            }
            for i in o.items
        ],
    }