# Contratos entre frentes

Los nombres siguientes describen el intercambio requerido. ModelProposal v1.0 tiene esquema ejecutable y fixtures en la rama de Axel; los demás no se consideran implementados ni tablas certificadas por aparecer aquí. Su implementación compartida corresponde a `cargomesh/src/shared/schemas/meta/`, y las mutaciones a los servicios autorizados de cada dueño.

| Contrato | Productor | Campos/relaciones mínimos | Consumidores |
| --- | --- | --- | --- |
| DeclaredManifest | Cristhian | requestId, revisión, grupos/unidad, autor de aprobación | Juan, explicación |
| MediaEvidence | Cristhian / Ramón | id, objeto privado, actor, fuente, hash, vínculo y estado | IA, sesión, worker, Passport |
| ModelProposal | Axel | inputRevision, campos/faltantes, evidenceRefs, modelo | Cristhian |
| Transcription | Luis | evidenceId, revisión, texto no confirmado | Axel, Cristhian |
| LoadingSession | Juan | sede, manifiesto/revisión, operación autorizada opcional, versión, alcance | Ramón |
| AnalysisJob | Ramón | evidencia/sesión, configuración, intento, estado y lease | Juan |
| LoadingObservation | Ramón | unidad, eventos/timecodes, conteo, calidad y cobertura | Juan |
| Reconciliation | Juan | versiones, comparable/motivos, esperado/observado/diferencia | Luis, Passport |
| HumanReview | Juan | conciliación/revisión, actor, decisión y motivo | Passport; incidencia solo con comando autorizado |

Reglas: la fuente tenant es el actor; revisiones e idempotencia se verifican antes de persistir; propuestas antiguas no sobreescriben cambios recientes. La clave de job incluye evidencia/configuración/revisión; procesamiento concluido no significa observación suficiente. El vídeo normalizado guarda su transformación temporal para que un timecode encuentre el frame correcto.

Antes de conectar dos módulos, el productor define el esquema y un fixture de éxito, desconocido y rechazo. Los fixtures viven junto al contrato que realmente los valide; no inventar un resultado de IA en un endpoint productivo. Si el contrato cambia, avisar a consumidores y revisar el delta.

Las APIs Meta se implementarán en [routes/meta](../../../cargomesh/src/server/hono/routes/meta/README.md); no se han añadido rutas funcionales en esta reorganización.

ModelProposal v1.0 ya tiene implementación, JSON Schema y fixtures en la rama de Axel: [contrato ejecutable y límites](MODEL_PROPOSAL.md). Su revisión/aceptación real están pendientes; los demás contratos mantienen su estado y dueños.
