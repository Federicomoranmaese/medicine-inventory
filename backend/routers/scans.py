import os
import uuid
import logging
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User, Product, InventoryScan, ScanDetail, Movement
from schemas import ScanResponse, UpdateDetailRequest, ConfirmScanRequest
from auth import get_current_user
from services.vision import analyze_image
from config import get_settings
import aiofiles

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.post("", response_model=ScanResponse)
async def create_scan(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recibe imagen, ejecuta pipeline AI y guarda resultados."""
    # Guardar imagen
    os.makedirs(settings.images_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.images_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Obtener productos conocidos para el prompt
    products = db.query(Product).filter(Product.active == True).all()
    known_products = [
        {"name": p.name, "lab": p.lab, "visual_description": p.visual_description}
        for p in products
    ]

    # Llamar a Claude Vision
    ai_results = []
    raw_response = ""
    try:
        ai_results, raw_response = analyze_image(filepath, known_products)
    except Exception as e:
        logger.error(f"Error en AI Vision: {e}")
        raw_response = f"ERROR: {e}"

    # Crear scan en DB
    scan = InventoryScan(
        photo_filename=filename,
        scanned_by=current_user.id,
        status="pending_review",
        ai_raw_response=raw_response,
    )
    db.add(scan)
    db.flush()

    # Crear detalles del scan para productos detectados por la AI
    detected_product_ids = set()
    for result in ai_results:
        product_id = None
        if result.get("is_known_product"):
            detected_name = result["product_name"].lower()
            # Matching parcial: busca si el nombre del producto en DB está contenido
            # en el nombre detectado por la AI, o viceversa.
            # Esto maneja casos como "Desvenlafaxina 100 mg — Farmacias del Ahorro"
            # que debe coincidir con "Desvenlafaxina 100 mg" en la DB.
            matched = None
            for p in products:
                db_name = p.name.lower()
                if db_name in detected_name or detected_name in db_name:
                    matched = p
                    break
            if matched:
                product_id = matched.id
                detected_product_ids.add(matched.id)

        prev_stock = 0
        if product_id:
            prod = db.query(Product).filter(Product.id == product_id).first()
            prev_stock = prod.current_stock if prod else 0

        count = result.get("count", 0)
        detail = ScanDetail(
            scan_id=scan.id,
            product_id=product_id,
            ai_detected_name=result.get("product_name", "Desconocido"),
            ai_count=count,
            ai_confidence=result.get("confidence", 0.0),
            final_count=count,
            user_corrected=False,
            previous_stock=prev_stock,
            difference=count - prev_stock,
        )
        db.add(detail)

    # Agregar productos del inventario que la AI NO detectó
    # Se muestran como alerta para que el usuario decida qué pasó con ellos
    for product in products:
        if product.id not in detected_product_ids:
            missing_detail = ScanDetail(
                scan_id=scan.id,
                product_id=product.id,
                ai_detected_name=product.name,
                ai_count=0,
                ai_confidence=0.0,
                # Por defecto asumimos que la AI no lo vio → mantener stock actual
                final_count=product.current_stock,
                user_corrected=False,
                previous_stock=product.current_stock,
                difference=0,
            )
            db.add(missing_detail)

    db.commit()
    db.refresh(scan)
    return scan


@router.get("", response_model=List[ScanResponse])
def list_scans(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista todos los scans ordenados por fecha descendente."""
    return (
        db.query(InventoryScan)
        .order_by(InventoryScan.scanned_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene un scan por ID con sus detalles."""
    scan = db.query(InventoryScan).filter(InventoryScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan no encontrado")
    return scan


@router.put("/{scan_id}/details/{detail_id}")
def update_detail(
    scan_id: int,
    detail_id: int,
    update: UpdateDetailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualizar conteo final de un producto en el scan."""
    detail = db.query(ScanDetail).filter(
        ScanDetail.id == detail_id,
        ScanDetail.scan_id == scan_id
    ).first()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")

    detail.final_count = update.final_count
    detail.user_corrected = True
    detail.difference = update.final_count - detail.previous_stock
    db.commit()
    return {"message": "Conteo actualizado"}


@router.post("/{scan_id}/confirm")
def confirm_scan(
    scan_id: int,
    request: ConfirmScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirma el scan y actualiza los stocks de los productos."""
    scan = db.query(InventoryScan).filter(InventoryScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan no encontrado")
    if scan.status == "confirmed":
        raise HTTPException(status_code=400, detail="El scan ya fue confirmado")

    # Actualizar stocks y crear movimientos
    for detail in scan.details:
        if detail.product_id:
            product = db.query(Product).filter(Product.id == detail.product_id).first()
            if product:
                old_stock = product.current_stock
                product.current_stock = detail.final_count
                product.updated_at = datetime.utcnow()

                # Crear movimiento de tipo scan_update
                movement = Movement(
                    product_id=detail.product_id,
                    movement_type="scan_update",
                    quantity=detail.final_count - old_stock,
                    note=f"Actualización por scan #{scan_id}",
                    created_by=current_user.id,
                    approved=True,
                    approved_by=current_user.id,
                )
                db.add(movement)

    scan.status = "confirmed"
    scan.confirmed_by = current_user.id
    scan.confirmed_at = datetime.utcnow()
    if request.notes:
        scan.notes = request.notes

    db.commit()
    return {"message": "Inventario actualizado exitosamente"}
