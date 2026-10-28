# Paquete del worker por implementar

Separar `jobs`, adaptación del proveedor SAM, normalización de tracks, contador puro, almacenamiento y callback. Los nombres concretos se acuerdan en RA-00/RA-01; esta carpeta no es todavía un paquete Python ejecutable.

Entradas/salidas siguen los contratos de `docs/meta/contracts/README.md`. Nunca descargar una URL arbitraria facilitada por un usuario; resolver evidencia autorizada en el servicio de medios. Aplicar límites de duración, tamaño, tiempo y reintentos.
