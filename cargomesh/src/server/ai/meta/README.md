# IA Meta — Axel y Luis

AX-00 y AX-01 incorporan el cliente SDK de texto, configuración, esquemas, propuestas revisables y modo META del chat. Véanse docs/meta/AX01_META_TEXT.md y docs/meta/contracts/MODEL_PROPOSAL.md desde la raíz.

| Dueño | Archivos / alcance | Estado |
| --- | --- | --- |
| Axel | client.ts, config.ts, schemas.ts, proposal-validation.ts, proposal-boundary.ts, interpret-declaration.ts, conversation.ts | Implementados; pruebas con HTTP inyectado; falta aceptación real con clave |
| Luis | transcribe.ts, explain-reconciliation.ts, entorno según su prompt | No implementados por este incremento |

Los adapters devuelven propuestas sin guardar, reservar, seleccionar ni crear incidencias. El frontend conserva el borrador y descarta respuestas antiguas. El cliente usa configuración exclusiva de servidor, JSON Schema/Zod, cancelación y reintentos acotados. Logs SDK deshabilitados; claves, prompts y respuestas no van a diagnóstico.

AX-01 es texto: una referencia a un archivo no implica haberlo inspeccionado. Media/transcripción y explicación son cortes posteriores. Baseten no es un failover silencioso. No hay prueba de inferencia real ni despliegue por existir estos archivos.
