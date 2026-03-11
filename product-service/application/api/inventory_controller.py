from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional
from base.database import get_db
from base.common import success_response, get_current_user, require_admin
from models.product import ProductVariant, Product
from models.inventory import InventoryLog

router = APIRouter(tags=["Inventory"])


# ---------- Schemas ----------

class StockAdjustRequest(BaseModel):
    variant_id: int
    change_qty: int       # positive = stock in, negative = stock out
    note: str             # required audit note


# ---------- Endpoints ----------

@router.post("/adjust")
async def adjust_stock(
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not payload.note or not payload.note.strip():
        raise HTTPException(status_code=400, detail="Audit note is required")

    variant = db.query(ProductVariant).filter(ProductVariant.id == payload.variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    new_qty = variant.stock_qty + payload.change_qty
    if new_qty < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Current: {variant.stock_qty}, requested change: {payload.change_qty}"
        )

    variant.stock_qty = new_qty

    log = InventoryLog(
        variant_id=variant.id,
        change_qty=payload.change_qty,
        note=payload.note.strip(),
        created_by=user.get("id"),
    )
    db.add(log)
    db.commit()
    db.refresh(variant)

    return success_response(
        data={
            "variant_id": variant.id,
            "new_stock_qty": variant.stock_qty,
            "change_qty": payload.change_qty,
            "note": log.note,
        },
        message="Stock adjusted successfully"
    )


@router.get("/logs/{variant_id}")
def get_audit_log(
    variant_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    logs = (
        db.query(InventoryLog)
        .filter(InventoryLog.variant_id == variant_id)
        .order_by(InventoryLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return success_response(data=[
        {
            "id": l.id,
            "change_qty": l.change_qty,
            "type": "in" if l.change_qty > 0 else "out",
            "note": l.note,
            "created_by": l.created_by,
            "created_at": str(l.created_at),
        }
        for l in logs
    ])


@router.get("/alerts")
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns all variants where stock_qty <= min_stock_qty."""
    variants = (
        db.query(ProductVariant)
        .options(joinedload(ProductVariant.product).joinedload(Product.category))
        .filter(
            ProductVariant.is_active == True,
            ProductVariant.stock_qty <= ProductVariant.min_stock_qty,
        )
        .order_by(ProductVariant.stock_qty.asc())
        .all()
    )

    return success_response(data=[
        {
            "variant_id": v.id,
            "variant_name": v.name,
            "sku": v.sku,
            "stock_qty": v.stock_qty,
            "min_stock_qty": v.min_stock_qty,
            "units_needed": max(0, v.min_stock_qty - v.stock_qty + 1),
            "product": {
                "id": v.product.id,
                "name": v.product.name,
                "image_url": v.product.image_url,
                "category": v.product.category.name if v.product.category else None,
            },
        }
        for v in variants
    ])
