# Transparencia de uso de Inteligencia Artificial

## Herramienta utilizada

- GitHub Copilot en VS Code durante esta sesión de implementación asistida.
- No se usaron Claude, Gemini ni Cursor para generar los artefactos descritos en este archivo.

## Casos de uso

- Descomposición de los requerimientos en fases, límites de servicios y decisiones de seguridad/consistencia.
- Scaffolding de TypeScript para NestJS, contratos compartidos, Next.js, Docker Compose y pruebas Jest.
- Preparación de casos de prueba para validación binaria, aislamiento por propietario, Outbox, búsqueda y worker.
- Redacción inicial de documentación de arquitectura y material de sustentación, revisados contra el comportamiento implementado.

## Prompts representativos

1. Se proporcionaron los dos documentos del proyecto y una instrucción detallada para implementar NestJS hexagonal, Next.js App Router, PostgreSQL/TypeORM, Elasticsearch, BullMQ/Redis, JWT, Magic Bytes, SSE, cobertura mínima y commits por fase.
2. Durante la implementación se solicitó iniciar el desarrollo y se aclararon interactivamente el usuario demo, almacenamiento compartido en Compose y SSE por `fetch` con `Authorization`.
3. Las instrucciones de fase incluyeron registrar por cada commit la decisión, trade-offs y preguntas/respuestas de sustentación, y mantener el estado de progreso por fases.

## Validación humana y límites

- Se leyeron las dos especificaciones de origen y se conciliaron los requisitos con la configuración real del repositorio antes de editar.
- Las decisiones que afectan identidad, storage, escalado y autenticación SSE se confirmaron con el usuario.
- Se inspeccionaron staging e historial, y se hicieron commits/push no forzados al remoto indicado.
- Backend y frontend se compilaron; Jest ejecutó mocks de persistencia, cola, filesystem, worker y cliente Elasticsearch.
- El build y las pruebas unitarias no sustituyen el smoke test con contenedores. La medición de latencia depende del entorno y dataset; no se deben afirmar garantías a partir de mocks.
- Las sugerencias de código se trataron como propuestas. Se corrigieron según el compilador los tipos de Elasticsearch/NestJS, se añadió cobertura y se documentaron los límites de Pub/Sub, archivos locales, sincronización de esquema y seguridad de la configuración demo.