# DockMind worker — Ramón/Jean

Estructura Python preparada, sin proceso, dependencias instaladas ni deploy. Fuente prevista: `src/dockmind/`; casos futuros: `tests/`.

Pipeline: job autorizado -> evidencia privada -> adaptación SAM -> tracks -> conteo de cruces por dirección -> observaciones versionadas -> callback autenticado/idempotente. Conservar revisión del manifiesto, intervalo, unidad, timecodes, incertidumbre y versión del análisis.

Identificadores de detección no garantizan identidad de un pallet durante todo el clip. Probar entrada/salida, oclusiones, reentrada y cruces inversos con vídeo propio antes de afirmar conteo exacto. La lógica de cruce se prueba como función pura con tracks sintéticos; la integración real con vídeo es evidencia independiente.

El plan prioriza llamada a SAM alojado desde worker CPU si el acceso lo permite. GPU propia es alternativa que requiere verificar pesos, licencia, memoria y API. No fijar versiones o requisitos de hardware sin esa comprobación. Ver `infra/meta/worker.md`.
