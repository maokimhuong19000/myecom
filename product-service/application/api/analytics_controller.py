from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional
from datetime import datetime, timedelta
from base.database import get_db
from base.common import success_response, get_current_user
from models.order import Order, OrderItem

router = APIRouter(tags=["Analytics"])


@router.get("/summary")
def analytics_summary(
    period: str = Query("month", enum=["day", "week", "month", "year", "all"]),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns KPI totals: volume, revenue, cost, net profit."""
    since = _period_start(period)

    q = db.query(
        func.sum(OrderItem.qty).label("total_volume"),
        func.sum(OrderItem.qty * OrderItem.unit_price).label("total_revenue"),
        func.sum(OrderItem.qty * OrderItem.unit_cost).label("total_cost"),
    ).join(Order, Order.id == OrderItem.order_id)

    if since:
        q = q.filter(Order.created_at >= since)

    result = q.first()

    revenue = float(result.total_revenue or 0)
    cost = float(result.total_cost or 0)

    return success_response(data={
        "period": period,
        "total_volume": int(result.total_volume or 0),
        "total_revenue_usd": round(revenue, 2),
        "total_cost_usd": round(cost, 2),
        "net_profit_usd": round(revenue - cost, 2),
        "profit_margin_pct": round((revenue - cost) / revenue * 100, 1) if revenue > 0 else 0,
    })


@router.get("/trends")
def analytics_trends(
    period: str = Query("week", enum=["day", "week", "month"]),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns time-series data for line charts."""
    if period == "day":
        # Last 24 hours grouped by hour
        since = datetime.utcnow() - timedelta(hours=24)
        trunc_expr = func.date_format(Order.created_at, "%Y-%m-%d %H:00")
        label = "hour"
    elif period == "week":
        # Last 7 days grouped by day
        since = datetime.utcnow() - timedelta(days=7)
        trunc_expr = func.date(Order.created_at)
        label = "day"
    else:
        # Last 30 days grouped by day
        since = datetime.utcnow() - timedelta(days=30)
        trunc_expr = func.date(Order.created_at)
        label = "day"

    rows = (
        db.query(
            trunc_expr.label("bucket"),
            func.sum(OrderItem.qty).label("volume"),
            func.sum(OrderItem.qty * OrderItem.unit_price).label("revenue"),
            func.sum(OrderItem.qty * OrderItem.unit_cost).label("cost"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= since)
        .group_by("bucket")
        .order_by("bucket")
        .all()
    )

    data = []
    for row in rows:
        revenue = float(row.revenue or 0)
        cost = float(row.cost or 0)
        data.append({
            "date": str(row.bucket),
            "volume": int(row.volume or 0),
            "revenue": round(revenue, 2),
            "cost": round(cost, 2),
            "profit": round(revenue - cost, 2),
        })

    return success_response(data={"period": period, "label": label, "series": data})


@router.get("/top-products")
def top_products(
    limit: int = 10,
    period: str = Query("month", enum=["week", "month", "year", "all"]),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from models.product import ProductVariant, Product
    since = _period_start(period)

    q = (
        db.query(
            ProductVariant.id.label("variant_id"),
            ProductVariant.name.label("variant_name"),
            Product.name.label("product_name"),
            func.sum(OrderItem.qty).label("total_sold"),
            func.sum(OrderItem.qty * OrderItem.unit_price).label("total_revenue"),
        )
        .join(OrderItem, OrderItem.variant_id == ProductVariant.id)
        .join(Order, Order.id == OrderItem.order_id)
        .join(Product, Product.id == ProductVariant.product_id)
    )

    if since:
        q = q.filter(Order.created_at >= since)

    rows = (
        q.group_by(ProductVariant.id, ProductVariant.name, Product.name)
        .order_by(func.sum(OrderItem.qty).desc())
        .limit(limit)
        .all()
    )

    return success_response(data=[
        {
            "variant_id": r.variant_id,
            "name": f"{r.product_name} - {r.variant_name}",
            "total_sold": int(r.total_sold),
            "total_revenue": round(float(r.total_revenue), 2),
        }
        for r in rows
    ])


def _period_start(period: str) -> Optional[datetime]:
    now = datetime.utcnow()
    mapping = {
        "day": now - timedelta(days=1),
        "week": now - timedelta(weeks=1),
        "month": now - timedelta(days=30),
        "year": now - timedelta(days=365),
        "all": None,
    }
    return mapping.get(period)
