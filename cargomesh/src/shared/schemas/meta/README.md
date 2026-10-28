# Contratos compartidos Meta

ModelProposal v1.0 tiene Zod ejecutable en model-proposal.ts y JSON Schema/fixtures en docs/meta/contracts/. Incluye fuentes, revisión de entrada, faltantes, advertencias, errores y metadatos. Revisar con Cristhian y Juan antes de integrar persistencia.

DeclaredManifest, MediaEvidence, Transcription, LoadingSession, AnalysisJob, LoadingObservation, Reconciliation y HumanReview conservan sus productores y dependencias de docs/meta/contracts/README.md; este incremento no los implementa.

Las propuestas no equivalen a datos confirmados. Actor, autorización, versiones e idempotencia siguen en los servicios de dominio. Todos los fixtures de IA se rotulan sintéticos; una prueba inyectada no es una respuesta real del proveedor.
