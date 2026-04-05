from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Movement, Product, User
from schemas import MovementCreate, MovementResponse
from auth import get_current_user, require_admin
from datetime import datetime

router = APIRouter(prefix="/api/movements", tags=["movements"])


@router.post("", response_model=MovementResponse)
def create_movement(
    movement: MovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra un nuevo movimiento de inventario."""
    product = db.query(Product).filter(
        Product.id == movement.product_id,
        Product.active == True
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if movement.movement_type not in ["sale", "purchase", "adjustment"]:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")

    db_movement = Movement(
        product_id=movement.product_id,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        note=movement.note,
        created_by=current_user.id,
        approved=current_user.role == "admin",
        approved_by=current_user.id if current_user.role == "admin" else None,
    )
    db.add(db_movement)

    # Si el admin crea el movimiento, actualizar stock inmediatamente
    if current_user.role == "admin":
        product.current_stock += movement.quantity
        product.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_movement)
    return db_movement


@router.get("", response_model=List[MovementResponse])
def list_movements(
    skip: int = 0,
    limit: int = 50,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista movimientos con filtro opcional por producto."""
    q = db.query(Movement)
    if product_id:
        q = q.filter(Movement.product_id == product_id)
    return q.order_by(Movement.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/{movement_id}/approve")
def approve_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Aprueba un movimiento pendiente y actualiza el stock (solo admin)."""
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    if movement.approved:
        raise HTTPException(status_code=400, detail="Movimiento ya aprobado")

    product = db.query(Product).filter(Product.id == movement.product_id).first()
    if product:
        product.current_stock += movement.quantity
        product.updated_at = datetime.utcnow()

    movement.approved = True
    movement.approved_by = current_user.id
    db.commit()
    return {"message": "Movimiento aprobado"}
