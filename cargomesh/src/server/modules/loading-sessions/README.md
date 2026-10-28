# Sesiones de carga — Juan

Servicio por implementar. Relaciona organización, sede autorizada, manifiesto y su revisión, vehículo/recurso cuando exista y operación real cuando esté disponible. Una sede no acredita cobertura ni capacidad.

Estados y transiciones se acuerdan antes del código: sesión abierta, análisis en proceso, lista para revisión y cierre humano. Estados de job son independientes del cierre. Un clip parcial no cierra automáticamente una operación ni confirma una entrega.

Produce contexto para el dashboard y jobs; consume manifiesto y evidencias. Preservar versión esperada e idempotencia. Un callback repetido u obsoleto no debe sobrescribir resultados nuevos. Las rutas Hono solo delegan en el servicio tras autenticar actor y alcance.
