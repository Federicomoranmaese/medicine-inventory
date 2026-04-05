# CLAUDE.md — Sistema de Inventario de Medicinas

Contexto y guía técnica completa para trabajar en este proyecto con Claude Code.

---

## Descripción del sistema

MVP de control de inventario para un consultorio médico pequeño en Puebla, México.
El flujo principal: tomar foto del cajón con medicinas → la AI detecta qué hay y cuántas unidades → el usuario confirma o corrige → se actualiza el inventario.

**Usuarios:**
- **Admin (dueño):** acceso completo — CRUD de productos, aprobar movimientos, ver precios
- **Asistentes (1-2):** escanear inventario, registrar ventas, ver stock

**Productos iniciales precargados:**
- TAFIL (Alprazolam) 1.0 mg — Pfizer
- Acetilcisteína — Farmacias del Ahorro
- Desvenlafaxina 100 mg — Farmacias del Ahorro

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Base de datos | SQLite (archivo local) + SQLAlchemy ORM |
| AI Vision | Anthropic Claude claude-sonnet-4-20250514 (vía API) |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Auth | JWT + bcrypt (PIN 4 dígitos para asistentes, contraseña para admin) |
| Infraestructura | Docker Compose (2 servicios: backend + frontend) |

**Versiones fijadas importantes:**
- `anthropic>=0.40.0` — versiones anteriores (0.26.x) son incompatibles con httpx>=0.28
- `bcrypt==3.2.2` — bcrypt 4.x rompe passlib 1.7.4
- `next: 15.0.3`

---

## Estructura de carpetas

```
medicine-inventory/
├── CLAUDE.md                  ← este archivo
├── docker-compose.yml
├── .env                       # gitignored — contiene API keys
├── .env.example
├── README.md
├── data/
│   ├── db/inventory.db        ← SQLite, se crea en primer arranque
│   └── images/                ← fotos de scans y extracción de productos
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                ← FastAPI app, CORS, mount /images
│   ├── config.py              ← Pydantic Settings desde .env
│   ├── database.py            ← SQLAlchemy engine + SessionLocal
│   ├── models.py              ← 5 modelos ORM
│   ├── schemas.py             ← Pydantic request/response schemas
│   ├── auth.py                ← JWT encode/decode, get_current_user, require_admin
│   ├── seed.py                ← crea admin + asistente + 3 productos al primer boot
│   ├── routers/
│   │   ├── auth.py            ← POST /api/auth/login
│   │   ├── products.py        ← CRUD + POST /api/products/extract-from-photo
│   │   ├── scans.py           ← pipeline AI: upload → Claude → resultados → confirm
│   │   ├── movements.py       ← ventas/compras/ajustes + aprobación admin
│   │   └── dashboard.py       ← stats agregadas
│   └── services/
│       └── vision.py          ← llamadas a Claude Vision API
├── frontend/
│   ├── Dockerfile             ← multi-stage: builder (npm build) + runner (standalone)
│   ├── package.json
│   ├── app/
│   │   ├── page.tsx           ← Dashboard
│   │   ├── login/page.tsx     ← PIN pad + acceso admin
│   │   ├── scan/page.tsx      ← flujo de escaneo con AI ⭐
│   │   ├── products/page.tsx  ← lista + CRUD + agregar con fotos
│   │   ├── movements/page.tsx ← registrar y aprobar movimientos
│   │   └── history/page.tsx   ← historial de scans con thumbnails
│   ├── components/
│   │   ├── navbar.tsx         ← header sticky + nav inferior móvil
│   │   └── pin-pad.tsx        ← teclado numérico 4 dígitos
│   └── lib/
│       ├── api.ts             ← fetch wrapper con auth header
│       └── auth.ts            ← JWT en localStorage
```

---

## Modelos de datos

```
User          → id, name, role (admin|assistant), pin_hash, password_hash
Product       → id, name, lab, presentation, visual_description, purchase_price,
                sale_price, current_stock, min_stock, active
InventoryScan → id, photo_filename, scanned_by, status, ai_raw_response, details[]
ScanDetail    → id, scan_id, product_id, ai_detected_name, ai_count, ai_confidence,
                final_count, user_corrected, previous_stock, difference
Movement      → id, product_id, movement_type, quantity, note, approved
```

---

## Cómo levantar el proyecto

### Requisitos
- Docker Desktop instalado y corriendo
- API Key de Anthropic (console.anthropic.com)

### Primera vez
```bash
cd medicine-inventory
cp .env.example .env
# Editar .env con ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_PASSWORD
docker-compose up --build
```

### Arranque normal (después del primer build)
```bash
docker-compose up -d          # background, libera la terminal
docker-compose up             # foreground, ver logs en tiempo real
```

### Credenciales por defecto
| Rol | Método | Valor |
|-----|--------|-------|
| Admin | contraseña | valor de ADMIN_PASSWORD en .env |
| Asistente | PIN | 1234 |

**URLs:** Frontend → http://localhost:3000 | Backend API → http://localhost:8000

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Logs solo del backend
docker-compose logs backend -f

# Reconstruir solo el backend (cambios en Python)
docker-compose up --build backend -d

# Reconstruir solo el frontend (cambios en Next.js/TypeScript)
docker-compose up --build frontend -d

# Reconstruir todo
docker-compose up --build -d

# Detener todo
docker-compose down

# Ejecutar comando en el backend
docker-compose exec backend python -c "..."

# Ver productos en la DB directamente
docker-compose exec backend python -c "
from database import SessionLocal
from models import Product
db = SessionLocal()
for p in db.query(Product).all():
    print(p.id, p.name, p.current_stock, p.active)
"

# Resetear la base de datos (CUIDADO: borra todo)
docker-compose down
rm data/db/inventory.db
docker-compose up -d
```

---

## Comportamiento del hot-reload

| Servicio | ¿Recarga automático? | Cuándo rebuild |
|----------|---------------------|----------------|
| Backend (Uvicorn `--reload`) | ✅ Sí — detecta cambios en `/app` | Solo si cambia `requirements.txt` o el `Dockerfile` |
| Frontend (Next.js standalone) | ❌ No — build compilado | Siempre que cambies código `.tsx/.ts` |

**Importante:** El frontend está compilado como build de producción dentro del contenedor. Cualquier cambio en `frontend/app/` o `frontend/components/` requiere `docker-compose up --build frontend -d`.

---

## Decisiones de arquitectura

### AI Vision con matching parcial
El pipeline de scan envía todas las imágenes a Claude con un prompt que incluye las descripciones visuales de los productos conocidos. Claude retorna JSON con nombres detectados.

El matching usa comparación parcial (substring) porque Claude frecuentemente devuelve nombres con formato extendido:
```
"Desvenlafaxina 100 mg — Farmacias del Ahorro"  →  match con  "Desvenlafaxina 100 mg"
```
Ver: `backend/routers/scans.py` línea del bucle de matching.

### Productos "no detectados" en scans
Cuando la AI no detecta un producto que SÍ existe en inventario, el sistema lo agrega automáticamente al scan como `ScanDetail` con `ai_count=0, ai_confidence=0.0`. El frontend distingue estos casos y muestra tarjetas de alerta con dos opciones:
- **"AI no lo vio"** → mantiene el stock actual (sin cambio)
- **"Ya no está"** → pone el stock en 0

El botón "Confirmar" queda bloqueado hasta que el usuario responda todos los productos no detectados.

### Extracción de producto con múltiples fotos
`POST /api/products/extract-from-photo` acepta hasta 5 imágenes (`files[]`). Todas se envían en un solo mensaje a Claude como contenido multimodal, mejorando la precisión al combinar ángulos.

### env_file en docker-compose
Se usa `env_file: .env` en lugar de la sintaxis `${VAR}` en el bloque `environment:`. La razón: la sintaxis `${VAR}` lee del shell del host (vacío en la mayoría de los casos), mientras que `env_file` inyecta directamente el archivo al contenedor.

### SQLite como base de datos
Decisión deliberada para simplificar el despliegue local. No requiere servicio adicional. El archivo `data/db/inventory.db` persiste en un volumen Docker. Para migrar a PostgreSQL en el futuro, solo se necesita cambiar `DATABASE_URL` en config.

### Frontend mobile-first
La app está diseñada para usarse de pie, con prisa, desde un celular. Botones mínimo 48px, navegación inferior fija, cámara con `capture="environment"` para abrir directamente la cámara trasera.

---

## Bugs conocidos y resueltos

| Bug | Causa | Solución |
|-----|-------|----------|
| `Client.__init__() got unexpected kwarg 'proxies'` | `anthropic==0.26.1` incompatible con `httpx>=0.28` | Actualizar a `anthropic>=0.40.0` |
| `password cannot be longer than 72 bytes` en seed | `bcrypt>=4.0` rompe la detección de versión en `passlib==1.7.4` | Fijar `bcrypt==3.2.2` |
| `ANTHROPIC_API_KEY=` vacío en contenedor | `docker-compose.yml` usaba `${VAR}` que lee del shell del host | Cambiar a `env_file: .env` |
| Productos detectados aparecen como "Nuevo" | Matching exacto fallaba (Claude devuelve nombres con lab incluido) | Cambiar a matching parcial/substring |
| `/app/public` not found en build del frontend | Directorio `public/` no existía en el proyecto Next.js | Crear `frontend/public/.gitkeep` |
| Producto vacío creado en DB | No había validación de nombre vacío en el backend | Agregar `if not product.name.strip()` antes de crear |
| Duplicado bloqueado aunque producto fue eliminado | `filter(Product.name == name)` incluía inactivos | Agregar `Product.active == True` al filtro |

---

## Deploy en Railway

Railway despliega el backend y el frontend como **dos servicios separados** dentro del mismo proyecto.

### Archivos creados para Railway

| Archivo | Propósito |
|---------|-----------|
| `backend/railway.toml` | Config del servicio backend (Dockerfile, healthcheck) |
| `frontend/railway.toml` | Config del servicio frontend (Dockerfile, healthcheck) |
| `backend/Dockerfile` | Usa `$PORT` dinámico de Railway, sin `--reload` |
| `frontend/Dockerfile` | Acepta `NEXT_PUBLIC_API_URL` como build arg |

### Paso a paso para hacer el deploy

#### Requisitos previos
- Cuenta en [railway.app](https://railway.app)
- Repo en GitHub (subir este proyecto)
- Railway CLI (opcional): `npm install -g @railway/cli`

#### 1. Crear el proyecto en Railway
1. En railway.app → **New Project** → **Deploy from GitHub repo**
2. Seleccionar el repositorio

#### 2. Configurar el servicio Backend
1. Railway detectará el repo — renombrar el servicio a `backend`
2. En **Settings → Build** → establecer **Root Directory**: `backend`
3. En **Variables** → agregar:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   JWT_SECRET=<string-aleatorio-largo>
   ADMIN_PASSWORD=<password-admin>
   ASSISTANT_PIN=1234
   ```
4. En **Settings → Networking** → **Generate Domain** → copiar la URL (e.g. `https://backend-xxx.up.railway.app`)

#### 3. Crear el volumen para persistencia (SQLite + imágenes)
1. En el proyecto Railway → **New** → **Volume**
2. Conectar el volumen al servicio `backend`
3. Establecer **Mount Path**: `/app/data`
4. Esto persiste tanto la base de datos (`/app/data/db/inventory.db`) como las imágenes escaneadas (`/app/data/images`)

#### 4. Configurar el servicio Frontend
1. En el proyecto → **New Service** → **GitHub Repo** → mismo repo
2. Renombrar a `frontend`
3. En **Settings → Build** → **Root Directory**: `frontend`
4. En **Variables** → agregar:
   ```
   NEXT_PUBLIC_API_URL=https://backend-xxx.up.railway.app
   ```
   ⚠️ Usar la URL real del backend copiada en el paso 2.
5. **Deploy** → Railway construirá la imagen con la URL bakeada

#### 5. Verificar el deploy
- Backend: `https://backend-xxx.up.railway.app/api/health` → `{"status":"ok"}`
- Frontend: `https://frontend-xxx.up.railway.app` → pantalla de login

### Nota sobre NEXT_PUBLIC_API_URL
Esta variable se **bake** (incrusta) en el bundle de Next.js durante el build.
Si cambias la URL del backend, debes hacer **redeploy del frontend** para que tome el nuevo valor.

### CORS en producción
El backend ya tiene `allow_origins=["*"]` en `main.py`, por lo que acepta requests del frontend en Railway sin cambios adicionales.

---

## Variables de entorno requeridas

```env
ANTHROPIC_API_KEY=sk-ant-...     # API key de Anthropic
JWT_SECRET=...                    # String aleatorio largo para firmar JWT
ADMIN_PASSWORD=...                # Contraseña del usuario admin
ASSISTANT_PIN=1234                # PIN del asistente por defecto (opcional)
```
