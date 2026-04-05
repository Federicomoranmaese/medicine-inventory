from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Product, InventoryScan, Movement, User
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna un resumen del estado actual del inventario."""
    products = db.query(Product).filter(Product.active == True).all()
    low_stock = [p for p in products if p.current_stock <= p.min_stock]
    pending_scans = db.query(InventoryScan).filter(
        InventoryScan.status == "pending_review"
    ).count()
    recent_movements = (
        db.query(Movement)
        .order_by(Movement.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_products": len(products),
        "low_stock_count": len(low_stock),
        "pending_scans": pending_scans,
        "products_summary": [
            {
                "id": p.id,
                "name": p.name,
                "current_stock": p.current_stock,
                "min_stock": p.min_stock,
                "is_low": p.current_stock <= p.min_stock,
                "sale_price": p.sale_price,
            }
            for p in products
        ],
        "low_stock_alerts": [
            {
                "id": p.id,
                "name": p.name,
                "current_stock": p.current_stock,
                "min_stock": p.min_stock,
            }
            for p in low_stock
        ],
        "recent_movements": [
            {
                "id": m.id,
                "product_id": m.product_id,
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "approved": m.approved,
                "created_at": m.created_at.isoformat(),
            }
            for m in recent_movements
        ],
    }
