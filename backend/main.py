import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from seed import seed_database
from routers import auth, products, scans, movements, dashboard
from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

# Crear tablas
Base.metadata.create_all(bind=engine)

# Seed inicial
seed_database()

app = FastAPI(title="Sistema de Inventario de Medicinas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir imágenes estáticas
os.makedirs(settings.images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=settings.images_dir), name="images")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(scans.router)
app.include_router(movements.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Sistema de inventario funcionando"}
