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

El siguiente texto sintetiza las instrucciones de trabajo utilizadas en la sesión; no es una transcripción literal de cada intercambio. Se aportaron las especificaciones de la prueba y se revisaron las propuestas de los agentes antes de incorporarlas:

> Actúa como asistente de desarrollo para el buscador y visor de documentos técnicos. Primero analiza el enunciado y la propuesta de arquitectura: distingue requisitos obligatorios, opcionales y supuestos que deban confirmarse conmigo. Organiza el trabajo asistido por agentes según función: uno descompone y planifica cada fase, otro propone la implementación acotada y otro revisa pruebas, seguridad y discrepancias con el requisito. Propón entregables y criterios de verificación para cada fase; presenta alternativas para que yo decida el alcance. No des por implementada ni medida ninguna capacidad sin evidencia.
>
> Fase 1: prepara el monorepo npm, contratos compartidos, Node 20 y Compose para PostgreSQL, Redis y Elasticsearch. Fase 2: estructura NestJS con dominio, aplicación e infraestructura y puertos probables sin acoplar casos de uso a adaptadores. Fase 3: implementa login demo JWT, validación de carga (tamaño, metadatos, contenido y tipo), almacenamiento con nombres seguros, persistencia transaccional y Outbox; responde 202 con ID y estado inicial. Fase 4: implementa worker BullMQ, extracción de texto, indexación Elasticsearch, búsqueda sin SQL LIKE con filtro por propietario, paginación y resaltado, y SSE autenticado con propagación entre procesos. Fase 5: añade pruebas unitarias para caminos felices y de error, con umbral de cobertura del 80%, y ejecuta compilación y comprobaciones con servicios reales cuando corresponda. Fase 6: desarrolla Next.js App Router para login, carga, búsqueda, estado en tiempo real y detalle; transmite JWT por cabeceras, incluso en SSE mediante `fetch`, y renderiza texto resaltado sin inyectar HTML. Si el visor requiere el original, plantea la ruta autenticada y la visualización por formato como ampliación.
>
> Antes de cada fase, explica decisiones, alternativas y límites; pregúntame por identidad demo, almacenamiento, seguridad y transporte de eventos cuando el requisito no los fije. Después verifica el comportamiento, separa lo observado de lo pendiente y registra preguntas de sustentación basadas en el código real.

Durante la ejecución se precisaron mediante preguntas el usuario demo, el almacenamiento compartido en Compose y el uso de SSE por `fetch` con `Authorization`. El visor de archivos originales se incorporó posteriormente como ampliación verificada.

## Validación humana y límites

- Se leyeron las dos especificaciones de origen y se conciliaron los requisitos con la configuración real del repositorio antes de editar.
- Las decisiones que afectan identidad, storage, escalado y autenticación SSE se confirmaron con el usuario.
- Se revisaron los cambios y las comprobaciones antes de publicar el trabajo en el repositorio remoto.
- Backend y frontend se compilaron; Jest ejecutó mocks de persistencia, cola, filesystem, worker y cliente Elasticsearch.
- El build y las pruebas unitarias no sustituyen el smoke test con contenedores. La medición de latencia depende del entorno y dataset; no se deben afirmar garantías a partir de mocks.
- Las sugerencias de código se trataron como propuestas. Se corrigieron según el compilador los tipos de Elasticsearch/NestJS, se añadió cobertura y se documentaron los límites de Pub/Sub, archivos locales, sincronización de esquema y seguridad de la configuración demo.