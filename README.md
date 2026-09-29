# Buscador y Visor de Documentos Técnicos

Monorepositorio para cargar, procesar, buscar y visualizar documentos técnicos. La solución se implementará con NestJS, Next.js, PostgreSQL, Elasticsearch y Redis/BullMQ.

## Requisitos locales

- Node.js 20 LTS y NVM para los comandos ejecutados en el host (`.nvmrc`).
- Docker Desktop con Docker Compose. PostgreSQL, Elasticsearch, Redis, API y Worker se ejecutan en contenedores; no se requiere instalar motores de base de datos en Windows.

```powershell
nvm install 20
nvm use 20
Copy-Item .env.example .env
docker compose up -d postgres elasticsearch redis
```

Los servicios publican sus puertos solo en `127.0.0.1`. Elasticsearch usa un nodo local de desarrollo con seguridad desactivada; no usar esta configuración en producción.

Los comandos de aplicación se documentarán aquí a medida que se incorporen el backend y el frontend.

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