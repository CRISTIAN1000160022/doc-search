# Buscador y Visor de Documentos Técnicos

Monorepositorio para cargar, procesar, buscar y visualizar documentos técnicos. La solución se implementará con NestJS, Next.js, PostgreSQL, Elasticsearch y Redis/BullMQ.

## Requisitos locales

- Node.js 20 LTS y NVM para los comandos ejecutados en el host (`.nvmrc`).
- Docker Desktop con Docker Compose. PostgreSQL, Elasticsearch, Redis, API y Worker se ejecutan en contenedores; no se requiere instalar motores de base de datos en Windows.

```powershell
nvm install 20
nvm use 20
Copy-Item .env.example .env
npm install
docker compose up --build -d
```

El secreto JWT de `.env.example` es una cadena local válida para arrancar; reemplázalo por un valor aleatorio antes de compartir el entorno.

Los servicios publican sus puertos solo en `127.0.0.1`. La API queda en `http://localhost:3001/api` y la salud en `/api/health`. El worker comparte con la API el volumen `./storage`. Elasticsearch usa un nodo local de desarrollo con seguridad desactivada; no usar esta configuración en producción.

La interfaz Next.js se ejecuta en el host para usar NVM:

```powershell
nvm use 20
npm run dev
```

Credenciales demo por defecto: `demo` / `local_dev_only_change_me` y `reviewer` / `local_dev_only_change_me_too`. Son identidades locales para probar el aislamiento por propietario, no cuentas productivas. Cambia los valores del archivo `.env` antes de compartir el entorno. El archivo `.env` está excluido de Git.

Para detener los servicios: `docker compose down`. Para conservar los datos se mantienen los volúmenes nombrados; `docker compose down -v` los elimina y debe usarse solo cuando se quiera reiniciar la base local.

La selección múltiple envía cada archivo como una solicitud independiente y cada uno recibe un ID/SSE propio. La contraseña, JWT secret y credenciales de PostgreSQL de `.env.example` son solo para desarrollo. Node.js 20 terminó soporte el 30 de abril de 2026; se fija por el requisito de la prueba, pero no debe adoptarse como runtime nuevo para producción.

## Estructura

```text
backend/             API NestJS y worker
frontend/            Aplicación Next.js (App Router)
packages/shared/     Contratos y tipos compartidos
docs/                Arquitectura, IA
docker-compose.yml   Servicios locales
```

## Documentación

- `docs/architecture.md`: arquitectura y flujos del sistema.
- `docs/ia.md`: transparencia del uso real de herramientas de IA.