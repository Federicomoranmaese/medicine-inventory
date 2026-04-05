# Sistema de Inventario de Medicinas con IA Vision

Sistema completo para gestionar el inventario de un consultorio médico en México, con capacidad de reconocer medicamentos automáticamente a través de fotografías usando Claude AI Vision.

## Características

- **Escaneo con IA**: Toma una foto del cajón de medicinas y la IA detecta automáticamente los productos y cuenta las unidades
- **Gestión de productos**: Catálogo con precios de compra/venta, stock actual y stock mínimo
- **Alertas de stock bajo**: Notificaciones automáticas cuando un producto cae por debajo del mínimo
- **Control de movimientos**: Registro de ventas, compras y ajustes con flujo de aprobación
- **Historial de scans**: Registro completo de todos los escaneos realizados
- **Roles de usuario**: Admin (contraseña) y Asistentes (PIN de 4 dígitos)
- **Interfaz móvil**: Diseñada para usarse desde el celular

## Tecnologías

- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Frontend**: Next.js 15 + Tailwind CSS + TypeScript
- **IA**: Claude claude-sonnet-4-20250514 Vision (Anthropic)
- **Despliegue**: Docker Compose

## Requisitos Previos

- Docker y Docker Compose instalados
- Clave de API de Anthropic (https://console.anthropic.com)

## Instalación y Uso

### 1. Clonar o descargar el proyecto

```bash
cd medicine-inventory
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo con tus valores:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-tu-clave-aqui
JWT_SECRET=un-string-aleatorio-de-al-menos-32-caracteres
ADMIN_PASSWORD=TuPasswordSegura123!
ASSISTANT_PIN=1234
```

**Importante**: Cambia todos los valores antes de usar en producción.

### 3. Iniciar con Docker Compose

```bash
docker-compose up -d
```

Esto levantará:
- Backend en http://localhost:8000
- Frontend en http://localhost:3000

### 4. Acceder a la aplicación

Abre http://localhost:3000 en tu navegador o celular.

**Login como asistente**: Ingresa el PIN (por defecto: `1234`)

**Login como admin**: Haz clic en "Acceso Admin" e ingresa la contraseña configurada en `ADMIN_PASSWORD`

### 5. Ver logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### 6. Detener el sistema

```bash
docker-compose down
```

## Uso de la Aplicación

### Escanear Inventario

1. Ve a la pestaña **Escanear**
2. Toma una foto del cajón con las medicinas (o sube una imagen)
3. Espera 5-15 segundos mientras la IA analiza la imagen
4. Revisa los productos detectados y corrige los conteos si es necesario
5. Haz clic en **Confirmar Inventario** para actualizar los stocks

### Gestión de Productos (solo Admin)

1. Ve a la pestaña **Productos**
2. Usa el botón **Nuevo** para agregar productos
3. Toca el ícono de edición para modificar un producto
4. El campo **Descripción visual** es crucial para que la IA reconozca el producto

### Movimientos

1. Ve a la pestaña **Movimientos**
2. Registra ventas (reducen stock), compras (aumentan stock) o ajustes
3. Los movimientos de asistentes requieren aprobación del admin

### Historial

- Ve el historial completo de todos los scans realizados
- Toca un scan para ver el detalle de productos detectados

## Estructura de la Base de Datos

La base de datos SQLite se guarda en `data/db/inventory.db`. Las imágenes de scans se guardan en `data/images/`.

Estos directorios persisten entre reinicios del contenedor gracias a los volúmenes de Docker.

## Datos Iniciales

Al iniciar por primera vez, el sistema crea automáticamente:
- Un usuario Admin
- Un usuario Asistente con el PIN configurado
- 3 productos de ejemplo:
  - TAFIL (Alprazolam) 1.0 mg
  - Acetilcisteína
  - Desvenlafaxina 100 mg

## API Documentation

Con el backend corriendo, accede a la documentación interactiva en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Solución de Problemas

### La IA no detecta los productos correctamente

- Asegúrate de tomar la foto con buena iluminación
- La descripción visual de cada producto en el catálogo debe ser detallada y precisa
- Intenta desde un ángulo más frontal

### Error de conexión al backend

```bash
docker-compose restart backend
```

### Resetear la base de datos

```bash
docker-compose down
rm data/db/inventory.db
docker-compose up -d
```

### Ver el estado de los contenedores

```bash
docker-compose ps
```

## Seguridad

- Cambia `JWT_SECRET` por un string aleatorio largo antes de usar en producción
- Usa una contraseña fuerte para `ADMIN_PASSWORD`
- El sistema está diseñado para uso en red local (LAN)
- No expongas los puertos 8000 o 3000 directamente a Internet sin un proxy HTTPS
