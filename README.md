# Cotizador de Reparación de Calzado

Aplicación web full-stack para generar cotizaciones de reparación de calzado. El usuario selecciona el tipo de calzado, los servicios de reparación y si el pedido es urgente; el sistema calcula el costo total y el tiempo estimado de entrega.

El proyecto está organizado en tres secciones que reflejan el progreso del taller académico:

| Carpeta | Contenido |
|---|---|
| `seccion-1-vibe-coding` | Infraestructura Docker Compose (MySQL + Nginx + backend) |
| `seccion-2-spec-driven-back` | Backend REST en Spring Boot 3 / Java 17 |
| `seccion-2-spec-driven-front` | Frontend estático (HTML + CSS + JS con ES modules) |
| `seccion-3-despliegueintegrado` | Despliegue integrado (en desarrollo) |

---

## Requerimientos mínimos

### Docker
| Herramienta | Versión recomendada |
|---|---|
| Docker Engine | 24.0 o superior (probado con 29.6.1) |
| Docker Compose | Plugin v2.20 o superior (`docker compose`, no `docker-compose`) |
| Docker Desktop (Windows/Mac) | 4.25 o superior |

Verificar versiones instaladas:

```bash
docker version
docker compose version
```

### Sistema operativo
- Windows 10/11 con WSL2 habilitado, macOS 12+, o Linux con Docker Engine instalado.
- En Windows: Docker Desktop debe estar corriendo **antes** de ejecutar cualquier comando.

### Dependencias externas
- Acceso a internet para descargar las imágenes base de Docker Hub en la primera ejecución:
  - `mysql:8.0`
  - `maven:3.9.6-eclipse-temurin-17` (solo en build)
  - `eclipse-temurin:17-jre-alpine`
  - `nginx:alpine`
- No se requiere Java, Maven ni Node.js instalados en la máquina host.

---

## Variables de entorno

Todas las variables se definen en `seccion-1-vibe-coding/.env`. Este archivo **no se sube al repositorio** (está en `.gitignore`). Hay que crearlo antes del primer levantamiento.

| Variable | Descripción | Valor de ejemplo |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Contraseña del usuario `root` de MySQL | `rootpassword` |
| `MYSQL_DATABASE` | Nombre de la base de datos | `cotizador_db` |
| `MYSQL_USER` | Usuario de aplicación de MySQL | `cotizador_user` |
| `MYSQL_PASSWORD` | Contraseña del usuario de aplicación | `cotizador_pass` |
| `NGINX_PORT` | Puerto del host donde Nginx escucha | `3000` |

> Cambiar `NGINX_PORT` si el puerto 3000 ya está ocupado en la máquina (por ejemplo, a `8090`).

---

## Levantar el proyecto desde cero

### 1. Clonar el repositorio

```bash
git clone https://github.com/mecadme/cotizadorCalzado.git
cd cotizadorCalzado
```

### 2. Crear el archivo de variables de entorno

```bash
# Desde la raíz del repositorio
cp seccion-1-vibe-coding/.env.example seccion-1-vibe-coding/.env
```

Si no existe `.env.example`, crearlo manualmente:

```bash
# Windows PowerShell
@"
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=cotizador_db
MYSQL_USER=cotizador_user
MYSQL_PASSWORD=cotizador_pass
NGINX_PORT=3000
"@ | Set-Content seccion-1-vibe-coding\.env
```

```bash
# Linux / macOS
cat > seccion-1-vibe-coding/.env << 'EOF'
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=cotizador_db
MYSQL_USER=cotizador_user
MYSQL_PASSWORD=cotizador_pass
NGINX_PORT=3000
EOF
```

### 3. Construir e iniciar todos los servicios

```bash
cd seccion-1-vibe-coding
docker compose up --build
```

- La primera ejecución descarga imágenes (~400 MB para Maven, ~65 MB para JRE) y compila el backend. Puede tardar 5-15 minutos según la conexión.
- Las ejecuciones posteriores reutilizan la caché de capas y son significativamente más rápidas.

### 4. Verificar que el entorno está operativo

Abrir el navegador en `http://localhost:3000` (o el puerto definido en `NGINX_PORT`).

Para verificar desde la terminal:

```bash
# Frontend — debe responder HTTP 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# API catálogo de calzado — debe responder JSON con la lista de tipos
curl http://localhost:3000/api/tipos-calzado

# API catálogo de reparaciones — debe responder JSON con la lista de servicios
curl http://localhost:3000/api/tipos-reparacion
```

---

## Comandos principales

Todos los comandos se ejecutan desde `seccion-1-vibe-coding/`.

### Construir imágenes y levantar servicios

```bash
# Primera vez o tras cambios en el código del backend
docker compose up --build

# En segundo plano (detached)
docker compose up --build -d
```

### Iniciar servicios (sin reconstruir)

```bash
docker compose up -d
```

### Detener servicios

```bash
# Detener y eliminar contenedores (los datos de MySQL se preservan en el volumen)
docker compose down

# Detener, eliminar contenedores Y borrar el volumen de MySQL (resetea la base de datos)
docker compose down -v
```

### Revisar logs

```bash
# Todos los servicios en tiempo real
docker compose logs -f

# Solo el backend
docker compose logs -f backend

# Solo Nginx
docker compose logs -f nginx

# Solo MySQL
docker compose logs -f mysql

# Últimas 50 líneas del backend
docker compose logs --tail=50 backend
```

### Reiniciar un servicio específico

```bash
# Reiniciar Nginx (útil tras cambios en nginx.conf o en el frontend)
docker compose restart nginx

# Reiniciar el backend (útil tras cambios en el código Java)
docker compose up --build -d backend
```

### Estado de los contenedores

```bash
docker compose ps
```

### Acceso directo a MySQL

```bash
docker compose exec mysql mysql -u cotizador_user -pcotizador_pass cotizador_db
```

---

## Estructura del proyecto

```
cotizadorCalzado/
├── seccion-1-vibe-coding/          # Infraestructura Docker
│   ├── docker-compose.yml          # Orquestación de los tres servicios
│   ├── .env                        # Variables de entorno (NO incluir en git)
│   ├── nginx/
│   │   ├── nginx.conf              # Configuración del servidor web y proxy inverso
│   │   └── logs/                   # Logs de acceso y error de Nginx
│   └── mysql/
│       └── init/                   # Scripts SQL ejecutados al inicializar MySQL
│
├── seccion-2-spec-driven-back/     # Backend Spring Boot
│   ├── Dockerfile                  # Build multistage: Maven → JRE alpine
│   ├── pom.xml                     # Dependencias y configuración Maven
│   ├── openapi.yaml                # Contrato OpenAPI 3.0 de la API
│   └── src/
│       └── main/
│           ├── java/               # Código fuente Java (arquitectura hexagonal)
│           └── resources/
│               └── application.properties
│
└── seccion-2-spec-driven-front/    # Frontend estático
    └── cotizador-frontend/         # Artefacto servido por Nginx
        ├── index.html              # Punto de entrada
        ├── css/
        │   └── estilos.css
        └── js/
            ├── app.js              # Coordinación de UI (ES module, punto de entrada)
            ├── api.js              # Adaptador HTTP hacia el backend
            └── state.js            # Estado de la aplicación
```

### Arquitectura de red Docker

```
Navegador
    │
    │  HTTP  :3000 (host)
    ▼
┌─────────────────────────────────────────┐
│  tallerdae-net (red interna Docker)     │
│                                         │
│  ┌──────────────┐                       │
│  │ Nginx :80    │  GET /            →  sirve cotizador-frontend/
│  │              │  GET /api/*       →  proxy_pass → backend:8080
│  └──────────────┘                       │
│         │                               │
│         ▼ :8080 (solo red interna)      │
│  ┌──────────────┐                       │
│  │ Backend      │  ←→  mysql:3306       │
│  │ Spring Boot  │                       │
│  └──────────────┘                       │
│         │                               │
│         ▼ :3306                         │
│  ┌──────────────┐                       │
│  │ MySQL 8.0    │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

### Puertos expuestos al host

| Puerto | Servicio | Descripción |
|---|---|---|
| `3000` (configurable) | Nginx | Único punto de entrada. Sirve el frontend y la API. |
| `3306` | MySQL | Acceso directo a la base de datos desde el host (útil para herramientas como DBeaver). |

El backend (puerto 8080) **no se expone al host** — solo es accesible dentro de la red Docker a través del proxy Nginx.

---

## API REST

Base URL dentro del entorno Docker: `http://localhost:3000/api`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/tipos-calzado` | Lista de tipos de calzado disponibles |
| `GET` | `/api/tipos-reparacion` | Lista de servicios de reparación con precio base |
| `POST` | `/api/cotizaciones` | Genera una cotización |

Ejemplo de cotización:

```bash
curl -X POST http://localhost:3000/api/cotizaciones \
  -H "Content-Type: application/json" \
  -d '{
    "tipoCalzadoId": "1",
    "tipoReparacionIds": ["1", "2"],
    "urgente": false
  }'
```

Ver el contrato completo en `seccion-2-spec-driven-back/openapi.yaml`.

---

## Solución de problemas comunes

### Docker Desktop no está corriendo (Windows)

```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

Abrir Docker Desktop desde el menú de inicio y esperar a que el icono de la ballena en la barra de tareas quede estático (no animado). Luego reintentar el comando.

### Puerto ya en uso

```
bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.
```

Otro proceso está usando el puerto definido en `NGINX_PORT` (por defecto 3000) o el 3306. Opciones:

1. Cambiar `NGINX_PORT` en `.env` a un puerto libre (por ejemplo `8090`).
2. Detener el proceso que ocupa el puerto:
   ```bash
   # Windows PowerShell — identificar qué usa el puerto 3000
   netstat -ano | findstr :3000
   ```

### El frontend carga pero la API falla (CORS / connection refused)

Verificar que `js/api.js` use ruta relativa `/api` y no `http://localhost:8080/api`. El backend no expone el puerto 8080 al host; todas las llamadas deben ir a través de Nginx.

### Maven falla al descargar dependencias (conexión inestable)

```
Premature end of Content-Length delimited message body
```

La descarga de dependencias Maven se interrumpió. Reintentar:

```bash
docker compose build --no-cache backend
```

### La base de datos no inicializa correctamente

Si MySQL arranca pero el backend no puede conectarse:

```bash
# Ver logs de MySQL
docker compose logs mysql

# Reiniciar desde cero borrando el volumen (se pierden los datos)
docker compose down -v
docker compose up --build
```

### Nginx devuelve 404 para archivos estáticos

Verificar que el volumen en `docker-compose.yml` apunte a la subcarpeta correcta del frontend:

```yaml
# Correcto
- ../seccion-2-spec-driven-front/cotizador-frontend:/usr/share/nginx/html:ro

# Incorrecto (sirve el index.html viejo del vibe-coding)
- ../seccion-2-spec-driven-front:/usr/share/nginx/html:ro
```

---

## Resumen de cambios aplicados al entorno Docker

Los siguientes cambios fueron necesarios para que el entorno funcione correctamente con la versión actual del proyecto:

| Archivo | Cambio | Motivo |
|---|---|---|
| `seccion-1-vibe-coding/docker-compose.yml` | Volumen de Nginx corregido de `../seccion-2-spec-driven-front` a `../seccion-2-spec-driven-front/cotizador-frontend` | El frontend se reorganizó en la subcarpeta `cotizador-frontend/`; Nginx servía el `index.html` antiguo del vibe-coding |
| `seccion-1-vibe-coding/nginx/nginx.conf` | Añadido tipo MIME `application/javascript` para extensión `.mjs` | Soporte explícito para ES modules con extensión `.mjs` |
| `seccion-2-spec-driven-front/cotizador-frontend/js/api.js` | URL base de `http://localhost:8080/api` cambiada a `/api` (ruta relativa) | El backend no expone el puerto 8080 al host; usar la URL absoluta causaba `connection refused` en el navegador |
