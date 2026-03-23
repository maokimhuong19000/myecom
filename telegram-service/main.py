import os, httpx
from datetime import datetime
from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import create_engine, text

TELEGRAM_TOKEN   = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
DB_URL      = os.getenv("DATABASE_URL", "mysql+pymysql://root:secret@db:3306/ecom_products")
STORE_NAME  = os.getenv("STORE_NAME", "NM Fashion")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=300)

async def send(msg: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"[TG] {msg}"); return
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            await c.post(f"{TELEGRAM_API}/sendMessage", json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": msg,
                "parse_mode": "HTML"
            })
    except Exception as e:
        print(f"[TG ERROR] {e}")

def now_str(): return datetime.now().strftime("%Y-%m-%d %H:%M")
def hdr(title, emoji): return f"{emoji} <b>{STORE_NAME}</b>\n<code>{'─'*28}</code>\n<b>{title}</b>\n"

async def health_check():
    services = [
        ("Auth",     "http://authentication-service:8000/health"),
        ("Products", "http://product-service:8001/health"),
        ("Frontend", "http://ecom:3000"),
    ]
    results, all_ok = [], True
    async with httpx.AsyncClient(timeout=5) as c:
        for name, url in services:
            try:
                r = await c.get(url)
                ok = r.status_code < 500
                results.append(f"{'✅' if ok else '🔴'} <b>{name}</b>: {r.status_code}")
                if not ok: all_ok = False
            except:
                results.append(f"🔴 <b>{name}</b>: Unreachable"); all_ok = False
    try:
        with engine.connect() as conn: conn.execute(text("SELECT 1"))
        results.append("✅ <b>Database</b>: Connected")
    except:
        results.append("🔴 <b>Database</b>: Unreachable"); all_ok = False
    await send(
        hdr("Health Check", "💚") +
        "\n".join(results) +
        f"\n\n{'✅' if all_ok else '🔴'} <b>{'All Systems OK' if all_ok else 'Issues Detected!'}</b>\n🕐 {now_str()}"
    )

async def check_low_stock():
    try:
        with engine.connect() as conn:
            rows = conn.execute(text("""
                SELECT pv.name as vname, p.name as pname, pv.stock_qty, pv.min_stock_qty
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.stock_qty <= pv.min_stock_qty AND pv.is_active = 1
                ORDER BY pv.stock_qty ASC LIMIT 10
            """)).fetchall()
        if not rows: return
        lines = [f"🟡 <b>{r.pname}</b> - {r.vname}: <b>{r.stock_qty}</b> left (min: {r.min_stock_qty})" for r in rows]
        await send(hdr(f"Low Stock ({len(rows)} items)", "⚠️") + "\n".join(lines) + f"\n🕐 {now_str()}")
    except Exception as e:
        print(f"[LOW STOCK] {e}")

async def daily_summary():
    try:
        with engine.connect() as conn:
            t = conn.execute(text("""
                SELECT COUNT(*) as orders, COALESCE(SUM(total_usd),0) as rev
                FROM orders WHERE DATE(created_at) = CURDATE()
            """)).fetchone()
            top = conn.execute(text("""
                SELECT p.name, SUM(oi.qty) as qty
                FROM order_items oi
                JOIN product_variants pv ON oi.variant_id = pv.id
                JOIN products p ON pv.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE DATE(o.created_at) = CURDATE()
                GROUP BY p.id, p.name ORDER BY qty DESC LIMIT 3
            """)).fetchall()
        tlines = "\n".join([f"   {i+1}. {r.name} ({r.qty} sold)" for i, r in enumerate(top)]) or "   No sales yet"
        await send(
            hdr("Daily Summary", "📅") +
            f"🛍️ <b>Orders:</b> {t.orders}\n"
            f"💰 <b>Revenue:</b> ${float(t.rev):.2f}\n\n"
            f"📊 <b>Top Products:</b>\n{tlines}\n"
            f"🕐 {now_str()}"
        )
    except Exception as e:
        print(f"[DAILY] {e}")

async def weekly_summary():
    try:
        with engine.connect() as conn:
            w = conn.execute(text("""
                SELECT COUNT(*) as orders, COALESCE(SUM(total_usd),0) as rev,
                       COALESCE(SUM(total_items),0) as items
                FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            """)).fetchone()
            top = conn.execute(text("""
                SELECT p.name, SUM(oi.qty) as qty, SUM(oi.unit_price * oi.qty) as rev
                FROM order_items oi
                JOIN product_variants pv ON oi.variant_id = pv.id
                JOIN products p ON pv.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY p.id, p.name ORDER BY rev DESC LIMIT 5
            """)).fetchall()
        tlines = "\n".join([f"   {i+1}. {r.name} — {r.qty} sold · ${float(r.rev):.2f}" for i, r in enumerate(top)]) or "   No sales"
        await send(
            hdr("Weekly Summary", "📆") +
            f"🛍️ <b>Orders:</b> {w.orders}\n"
            f"💰 <b>Revenue:</b> ${float(w.rev):.2f}\n"
            f"📦 <b>Items Sold:</b> {w.items}\n\n"
            f"📊 <b>Top Products:</b>\n{tlines}\n"
            f"🕐 {now_str()}"
        )
    except Exception as e:
        print(f"[WEEKLY] {e}")

scheduler = AsyncIOScheduler(timezone="Asia/Phnom_Penh")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(health_check,    "interval", days=1, id="health")
    scheduler.add_job(check_low_stock, "interval", hours=2,    id="low_stock")
    scheduler.add_job(daily_summary,   "cron", hour=20, minute=0, id="daily")
    scheduler.add_job(weekly_summary,  "cron", day_of_week="mon", hour=9, id="weekly")
    scheduler.start()
    await send(hdr("System Started", "✅") + "✅ All services are running\n🕐 " + now_str())
    yield
    scheduler.shutdown()

app = FastAPI(title="NM Fashion Telegram Bot", lifespan=lifespan)

@app.get("/health")
async def health(): return {"status": "ok"}

@app.post("/notify/order")
async def on_order(req: Request):
    d = await req.json()
    change = d.get("change_usd")
    change_line = f"\n💵 <b>Change:</b> ${change:.2f}" if change is not None else ""
    khr = d.get("total_khr", 0)
    item_lines = d.get("item_lines", "")
    msg = (
        hdr("New Order Received", "🛍️") +
        f"<code>Order #{d.get('order_id', 0)}</code>\n\n"
        f"<b>Items:</b>\n{item_lines}\n\n"
        f"💰 <b>Total:</b> ${d.get('total_usd', 0):.2f} ({int(khr):,} ៛)"
        f"{change_line}\n"
        f"ℹ️ <b>Payment:</b> {d.get('payment_method', '').upper()}\n"
        f"👤 <b>Staff:</b> {d.get('staff', 'POS')}\n"
        f"🕐 {now_str()}"
    )
    await send(msg)
    return {"ok": True}

@app.post("/notify/low-stock")
async def on_low_stock(req: Request):
    d = await req.json()
    await send(
        hdr("Low Stock Alert", "⚠️") +
        f"📦 <b>{d.get('product_name', '')}</b>\n"
        f"   Variant: {d.get('variant_name', '')}\n"
        f"🟡 Stock: <b>{d.get('stock_qty', 0)}</b> (min: {d.get('min_stock_qty', 0)})\n"
        f"🕐 {now_str()}"
    )
    return {"ok": True}

@app.post("/notify/user-registered")
async def on_register(req: Request):
    d = await req.json()
    await send(
        hdr("New User Registered", "🎉") +
        f"👤 <b>{d.get('full_name', '')}</b>\n"
        f"ℹ️ Email: {d.get('email', '')}\n"
        f"ℹ️ Role: {d.get('role', '').upper()}\n"
        f"🕐 {now_str()}"
    )
    return {"ok": True}

@app.post("/notify/user-login")
async def on_login(req: Request):
    d = await req.json()
    await send(
        hdr("User Login", "🔐") +
        f"👤 <b>{d.get('full_name', '')}</b> logged in\n"
        f"ℹ️ Email: {d.get('email', '')}\n"
        f"ℹ️ Role: {d.get('role', '').upper()}\n"
        f"🕐 {now_str()}"
    )
    return {"ok": True}

@app.post("/notify/error")
async def on_error(req: Request):
    d = await req.json()
    await send(
        hdr("System Error", "🔴") +
        f"🔴 <b>Service:</b> {d.get('service', '')}\n"
        f"ℹ️ <b>Endpoint:</b> {d.get('endpoint', 'N/A')}\n"
        f"<code>{str(d.get('error', ''))[:300]}</code>\n"
        f"🕐 {now_str()}"
    )
    return {"ok": True}

@app.post("/notify/health")
async def trig_health(req: Request):
    await health_check(); return {"ok": True}

@app.post("/notify/daily")
async def trig_daily(req: Request):
    await daily_summary(); return {"ok": True}

@app.post("/notify/weekly")
async def trig_weekly(req: Request):
    await weekly_summary(); return {"ok": True}