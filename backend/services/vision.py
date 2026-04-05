import anthropic
import base64
import json
import re
import logging
from typing import List, Dict, Any, Tuple
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VISION_PROMPT = """Eres un asistente de inventario de medicinas para un consultorio en México.

Analiza esta foto de un cajón con medicinas y detecta TODOS los productos visibles.

Productos conocidos en el inventario:
{products_list}

Para cada producto detectado:
1. Identifica el nombre exacto del producto
2. Cuenta cuántas unidades visibles hay (cajas, frascos o tubos individuales)
3. Indica tu nivel de confianza (0.0 a 1.0)
4. Si el producto coincide con uno conocido, usa el nombre exacto del inventario

Reglas:
- Cuenta unidades COMPLETAS (cada caja es 1, cada frasco es 1, cada tubo es 1)
- Si hay productos parcialmente ocultos, indícalo en las notas
- Si ves un producto que NO está en la lista conocida, repórtalo como nuevo
- Confianza < 0.5 para detecciones dudosas

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional:
[
  {{
    "product_name": "nombre exacto del inventario si coincide, o descripción si es nuevo",
    "is_known_product": true/false,
    "count": número,
    "confidence": número entre 0.0 y 1.0,
    "notes": "observaciones opcionales"
  }}
]"""


def analyze_image(image_path: str, known_products: List[Dict]) -> Tuple[List[Dict[str, Any]], str]:
    """Analiza una imagen con Claude Vision y retorna los productos detectados."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Leer y codificar imagen
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    # Determinar tipo de imagen
    if image_path.lower().endswith(".png"):
        media_type = "image/png"
    elif image_path.lower().endswith(".gif"):
        media_type = "image/gif"
    elif image_path.lower().endswith(".webp"):
        media_type = "image/webp"
    else:
        media_type = "image/jpeg"

    # Construir lista de productos conocidos para el prompt
    products_list = "\n".join([
        f"- {p['name']} — {p['lab']} — {p['visual_description']}"
        for p in known_products
    ])

    prompt = VISION_PROMPT.format(products_list=products_list)

    logger.info("Enviando imagen a Claude Vision para análisis...")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ],
            }
        ],
    )

    raw_response = message.content[0].text
    logger.info(f"Respuesta de Claude: {raw_response}")

    # Parsear respuesta JSON
    parsed = parse_ai_response(raw_response)
    return parsed, raw_response


EXTRACT_PRODUCT_PROMPT = """Eres un asistente de inventario de medicinas para un consultorio en México.

Analiza esta foto de un medicamento y extrae la información del producto.

Extrae:
1. Nombre del medicamento (con dosis si aparece, ej: "Omeprazol 20 mg")
2. Laboratorio o fabricante (ej: "Pfizer", "Farmacias del Ahorro", "Pisa")
3. Presentación (ej: "Caja con 30 cápsulas", "Frasco con 20 tabletas", "Tubo efervescente")
4. Descripción visual detallada para reconocimiento futuro por AI (colores, forma, texto visible en empaque)

Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional:
{{
  "name": "nombre del medicamento con dosis",
  "lab": "laboratorio o fabricante",
  "presentation": "forma farmacéutica y cantidad",
  "visual_description": "descripción visual detallada del empaque para reconocimiento por AI",
  "confidence": número entre 0.0 y 1.0
}}"""


def _get_media_type(path: str) -> str:
    """Devuelve el media type de la imagen según su extensión."""
    ext = path.lower().split(".")[-1]
    return {"png": "image/png", "gif": "image/gif", "webp": "image/webp"}.get(ext, "image/jpeg")


def extract_product_info(image_paths: List[str]) -> Tuple[Dict[str, Any], str]:
    """Extrae información de un producto desde una o varias fotos (distintos ángulos)."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Construir contenido del mensaje: todas las imágenes + prompt al final
    content: List[Dict] = []
    for i, path in enumerate(image_paths):
        with open(path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": _get_media_type(path),
                "data": image_data,
            },
        })
        if len(image_paths) > 1:
            content.append({"type": "text", "text": f"Foto {i + 1} de {len(image_paths)}"})

    content.append({"type": "text", "text": EXTRACT_PRODUCT_PROMPT})

    logger.info(f"Extrayendo información de producto desde {len(image_paths)} foto(s)...")

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": content}],
    )

    raw_response = message.content[0].text
    logger.info(f"Extracción de producto: {raw_response}")

    try:
        result = json.loads(raw_response)
    except json.JSONDecodeError:
        obj_match = re.search(r'\{.*?\}', raw_response, re.DOTALL)
        if obj_match:
            try:
                result = json.loads(obj_match.group())
            except json.JSONDecodeError:
                result = {}
        else:
            result = {}

    return result, raw_response


def parse_ai_response(raw_response: str) -> List[Dict[str, Any]]:
    """Parsea la respuesta JSON de la AI con fallback."""
    try:
        # Intentar parsear directamente
        return json.loads(raw_response)
    except json.JSONDecodeError:
        pass

    # Intentar extraer JSON de markdown
    json_match = re.search(r'\[.*?\]', raw_response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Fallback: retornar lista vacía
    logger.error(f"No se pudo parsear respuesta de AI: {raw_response}")
    return []
