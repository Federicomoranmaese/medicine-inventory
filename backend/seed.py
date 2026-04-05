from database import SessionLocal, engine, Base
from models import User, Product
from auth import hash_password
from config import get_settings
import logging

logger = logging.getLogger(__name__)


def seed_database():
    """Inicializa la base de datos con datos de prueba si está vacía."""
    settings = get_settings()
    db = SessionLocal()
    try:
        # Verificar si ya hay usuarios
        if db.query(User).count() > 0:
            logger.info("Base de datos ya inicializada, omitiendo seed.")
            return

        logger.info("Inicializando base de datos con datos de prueba...")

        # Crear admin
        admin = User(
            name="Admin",
            role="admin",
            password_hash=hash_password(settings.admin_password),
            active=True
        )
        db.add(admin)

        # Crear asistente por defecto
        assistant = User(
            name="Asistente 1",
            role="assistant",
            pin_hash=hash_password(settings.assistant_pin),
            active=True
        )
        db.add(assistant)

        # Los 3 productos iniciales
        products = [
            Product(
                name="TAFIL (Alprazolam) 1.0 mg",
                lab="Pfizer",
                presentation="Caja con 90 tabletas",
                visual_description="Caja mediana blanca con franja azul marino, logo Pfizer en blanco sobre azul, texto TAFIL grande en azul oscuro, texto Alprazolam debajo",
                purchase_price=850.00,
                sale_price=1050.00,
                current_stock=1,
                min_stock=2,
            ),
            Product(
                name="Acetilcisteína",
                lab="Farmacias del Ahorro",
                presentation="Tubo efervescente",
                visual_description="Tubo cilíndrico pequeño blanco o crema con tapón blanco, texto ACETILCISTEINA en azul, logo Farmacias del Ahorro en rojo, etiqueta con texto pequeño",
                purchase_price=95.00,
                sale_price=135.00,
                current_stock=1,
                min_stock=3,
            ),
            Product(
                name="Desvenlafaxina 100 mg",
                lab="Farmacias del Ahorro",
                presentation="Frasco con 20 tabletas, liberación prolongada",
                visual_description="Frasco de plástico blanco con tapa azul brillante, etiqueta blanca con texto Desvenlafaxina 100mg, logo Farmacias del Ahorro en rojo, texto Liberación Prolongada",
                purchase_price=180.00,
                sale_price=250.00,
                current_stock=1,
                min_stock=2,
            ),
        ]
        for p in products:
            db.add(p)

        db.commit()
        logger.info("Seed completado exitosamente.")
    except Exception as e:
        logger.error(f"Error en seed: {e}")
        db.rollback()
    finally:
        db.close()
