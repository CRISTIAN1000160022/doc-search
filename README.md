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

Los servicios publican sus puertos solo en `127.0.0.1`. La API queda en `http://localhost:3001/api` y la salud en `/api/health`. El worker comparte con la API el volumen `./storage`. Elasticsearch usa un nodo local de desarrollo con seguridad desactivada; no usar esta configuración en producción.

La interfaz Next.js se ejecuta en el host para usar NVM:

```powershell
nvm use 20
npm run dev --workspace @doc-search/frontend
```

Credenciales demo por defecto: usuario `demo`; contraseña `local_dev_only_change_me`. Cambia los valores del archivo `.env` antes de compartir el entorno. El archivo `.env` está excluido de Git.

Para detener los servicios: `docker compose down`. Para conservar los datos se mantienen los volúmenes nombrados; `docker compose down -v` los elimina y debe usarse solo cuando se quiera reiniciar la base local.

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