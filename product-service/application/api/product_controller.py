from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional, List
import os, shutil, uuid
from base.database import get_db
from base.common import success_response, get_current_user, require_admin
from models.product import Product, ProductVariant, Category

router = APIRouter(tags=["Products"])

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ---------- Schemas ----------

class VariantIn(BaseModel):
    name: str
    sku: Optional[str] = None
    sale_price: float
    stock_qty: int = 0
    min_stock_qty: int = 5

class ProductIn(BaseModel):
    category_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    cost_price: float = 0.0
    variants: List[VariantIn] = []

class CategoryIn(BaseModel):
    name: str
    description: Optional[str] = None

# ---------- Image Upload ----------

@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    _=Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, GIF allowed")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return success_response(
        data={"url": f"/api/products/catalog/uploads/{filename}"},
        message="Image uploaded"
    )

@router.get("/uploads/{filename}")
async def serve_image(filename: str):
    from fastapi.responses import FileResponse
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(filepath)

# ---------- Categories ----------

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.name).all()
    return success_response(data=[_cat_dict(c) for c in cats])

@router.post("/categories", status_code=201)
async def create_category(
    payload: CategoryIn,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    cat = Category(name=payload.name, description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return success_response(data=_cat_dict(cat), message="Category created")

# ---------- Products ----------

@router.get("")
def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(
        joinedload(Product.variants),
        joinedload(Product.category)
    ).filter(Product.is_active == True)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    if category_id:
        q = q.filter(Product.category_id == category_id)
    products = q.order_by(Product.name).all()
    return success_response(data=[_product_dict(p) for p in products])

@router.get("/barcode/{code}")
def get_by_barcode(code: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.variants),
        joinedload(Product.category)
    ).filter(Product.barcode == code, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return success_response(data=_product_dict(product))

@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.variants),
        joinedload(Product.category)
    ).filter(Product.id == product_id, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return success_response(data=_product_dict(product))

@router.post("", status_code=201)
async def create_product(
    payload: ProductIn,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if payload.barcode:
        existing = db.query(Product).filter(Product.barcode == payload.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Barcode already exists")
    product = Product(
        category_id=payload.category_id,
        name=payload.name,
        description=payload.description,
        barcode=payload.barcode,
        image_url=payload.image_url,
        cost_price=payload.cost_price,
    )
    db.add(product)
    db.flush()
    for v in payload.variants:
        db.add(ProductVariant(
            product_id=product.id,
            name=v.name,
            sku=v.sku,
            sale_price=v.sale_price,
            stock_qty=v.stock_qty,
            min_stock_qty=v.min_stock_qty,
        ))
    db.commit()
    db.refresh(product)
    return success_response(data=_product_dict(product), message="Product created")

@router.put("/{product_id}")
async def update_product(
    product_id: int,
    payload: ProductIn,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.category_id = payload.category_id
    product.name = payload.name
    product.description = payload.description
    product.barcode = payload.barcode
    product.image_url = payload.image_url
    product.cost_price = payload.cost_price
    for variant in product.variants:
        variant.is_active = False
    for v in payload.variants:
        existing_v = None
        if v.sku:
            existing_v = db.query(ProductVariant).filter(
                ProductVariant.sku == v.sku,
                ProductVariant.product_id == product_id
            ).first()
        if existing_v:
            existing_v.name = v.name
            existing_v.sale_price = v.sale_price
            existing_v.min_stock_qty = v.min_stock_qty
            existing_v.is_active = True
        else:
            db.add(ProductVariant(
                product_id=product.id,
                name=v.name,
                sku=v.sku,
                sale_price=v.sale_price,
                stock_qty=v.stock_qty,
                min_stock_qty=v.min_stock_qty,
            ))
    db.commit()
    db.refresh(product)
    return success_response(data=_product_dict(product), message="Product updated")

@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    db.commit()
    return success_response(message="Product deleted")

# ---------- Helpers ----------

def _cat_dict(c: Category) -> dict:
    return {"id": c.id, "name": c.name, "description": c.description}

def _product_dict(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "barcode": p.barcode,
        "image_url": p.image_url,
        "cost_price": float(p.cost_price),
        "is_active": p.is_active,
        "category": _cat_dict(p.category) if p.category else None,
        "created_at": str(p.created_at),
        "variants": [_variant_dict(v) for v in p.variants if v.is_active],
    }

def _variant_dict(v: ProductVariant) -> dict:
    return {
        "id": v.id,
        "name": v.name,
        "sku": v.sku,
        "sale_price": float(v.sale_price),
        "stock_qty": v.stock_qty,
        "min_stock_qty": v.min_stock_qty,
        "is_low_stock": v.stock_qty <= v.min_stock_qty,
    }
