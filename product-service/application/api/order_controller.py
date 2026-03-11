from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from base.database import get_db
from base.common import success_response, get_current_user
from models.product import ProductVariant
from models.order import Order, OrderItem
from models.inventory import InventoryLog

router = APIRouter(tags=["Orders"])

DEFAULT_EXCHANGE_RATE = 4100.0   # 1 USD = 4100 KHR (update via env or config)


# ---------- Schemas ----------

class CartItem(BaseModel):
    variant_id: int
    qty: int


class CheckoutRequest(BaseModel):
    items: List[CartItem]
    payment_method: str = "cash"       # "cash" or "khqr"
    cash_tendered_usd: Optional[float] = None
    exchange_rate: Optional[float] = None


# ---------- Endpoints ----------

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

    # Validate all items first
    for item in payload.items:
        variant = db.query(ProductVariant).options(
            joinedload(ProductVariant.product)
        ).filter(ProductVariant.id == item.variant_id, ProductVariant.is_active == True).first()

        if not variant:
            raise HTTPException(status_code=404, detail=f"Variant {item.variant_id} not found")
        if variant.stock_qty < item.qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{variant.product.name} - {variant.name}'. Available: {variant.stock_qty}"
            )

        line_total = float(variant.sale_price) * item.qty
        total_usd += line_total
        order_items_data.append((variant, item.qty, float(variant.sale_price), float(variant.product.cost_price)))

    total_khr = round(total_usd * rate, 0)
    change_usd = None
    if payload.payment_method == "cash" and payload.cash_tendered_usd is not None:
        change_usd = round(payload.cash_tendered_usd - total_usd, 2)
        if change_usd < 0:
            raise HTTPException(status_code=400, detail="Cash tendered is less than total")

    # Create order
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

    # Create items + deduct stock
    for variant, qty, unit_price, unit_cost in order_items_data:
        db.add(OrderItem(
            order_id=order.id,
            variant_id=variant.id,
            qty=qty,
            unit_price=unit_price,
            unit_cost=unit_cost,
        ))
        variant.stock_qty -= qty
        db.add(InventoryLog(
            variant_id=variant.id,
            change_qty=-qty,
            note=f"Sold — Order #{order.id}",
            created_by=user.get("id"),
        ))

    db.commit()
    db.refresh(order)

    return success_response(
        data={
            "order_id": order.id,
            "total_usd": float(order.total_usd),
            "total_khr": float(order.total_khr),
            "exchange_rate": float(order.exchange_rate),
            "payment_method": order.payment_method,
            "change_usd": float(order.change_usd) if order.change_usd is not None else None,
            "created_at": str(order.created_at),
        },
        message="Order placed successfully"
    )


@router.get("")
def list_orders(
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(limit)
        .all()
    )
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
