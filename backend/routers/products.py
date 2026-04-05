import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Product
from schemas import ProductCreate, ProductUpdate, ProductResponse
from auth import get_current_user, require_admin
from models import User
from datetime import datetime
from services.vision import extract_product_info
from config import get_settings
import aiofiles

settings = get_settings()

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("/extract-from-photo")
async def extract_from_photo(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_admin)
):
    """Recibe una o varias fotos de un medicamento y extrae su información con AI."""
    os.makedirs(settings.images_dir, exist_ok=True)
    filepaths = []

    for file in files:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"product_extract_{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.images_dir, filename)
        async with aiofiles.open(filepath, "wb") as f:
            content = await file.read()
            await f.write(content)
        filepaths.append(filepath)

    try:
        result, _ = extract_product_info(filepaths)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al analizar imagen: {e}")

    return {
        "name": result.get("name", ""),
        "lab": result.get("lab", ""),
        "presentation": result.get("presentation", ""),
        "visual_description": result.get("visual_description", ""),
        "confidence": result.get("confidence", 0.0),
    }


@router.get("", response_model=List[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos los productos activos."""
    return db.query(Product).filter(Product.active == True).all()


@router.post("", response_model=ProductResponse)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Crea un nuevo producto (solo admin)."""
    if not product.name.strip():
        raise HTTPException(status_code=400, detail="El nombre del producto no puede estar vacío")
    existing = db.query(Product).filter(Product.name == product.name, Product.active == True).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese nombre")
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Actualiza un producto (solo admin)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Elimina (desactiva) un producto (solo admin)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.active = False
    product.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Producto eliminado"}
