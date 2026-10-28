# Manifiesto declarado — Cristhian

Servicio por implementar para la declaración revisada del envío. Consumirá el request autorizado existente y propuestas de IA validadas; conservará revisión, unidades y procedencia de cada dato.

Entradas: actor, request, payload canónico, clave de idempotencia y versión esperada. Salida: manifiesto persistido/versionado o conflicto estable. Peso y dimensiones desconocidos siguen desconocidos. No convertir una cantidad estimada desde una foto en confirmación.

Consumidores: sesión de carga y comparación de Juan; interpretación de Axel. Una sesión conserva la revisión del manifiesto que abrió, aunque el request cambie después. Separar repositorio/persistencia, servicio y esquema; acordar el contrato en `docs/meta/contracts/README.md` antes de crear tablas o exports.
