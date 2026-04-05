from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import LoginRequest, TokenResponse
from auth import verify_password, create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login con PIN (asistentes) o contraseña (admin)."""
    user = None

    if request.pin:
        # Buscar asistentes y verificar PIN
        assistants = db.query(User).filter(User.role == "assistant", User.active == True).all()
        for a in assistants:
            if a.pin_hash and verify_password(request.pin, a.pin_hash):
                user = a
                break
    elif request.password:
        # Buscar admin y verificar contraseña
        admins = db.query(User).filter(User.role == "admin", User.active == True).all()
        for a in admins:
            if a.password_hash and verify_password(request.password, a.password_hash):
                user = a
                break

    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = create_token(user.id, user.role)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        user_name=user.name,
        user_role=user.role
    )
