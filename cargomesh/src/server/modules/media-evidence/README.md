# Evidencia de medios — Cristhian, consumo de Ramón/Jean

Infraestructura de dominio por implementar para fotos, audio y clips. Una evidencia pertenece a una organización, request o sesión autorizada y conserva tipo, tamaño, hash, autor y fecha. El archivo y el acceso a él no equivalen a un resultado de análisis.

Prever upload validado, bucket privado y URLs firmadas de corta duración. Validar tamaño, MIME real, extensión y permisos; no persistir URLs firmadas como identidad del archivo. Separar retención del original, derivados y resultados. Nunca incluir una clave de servicio en navegador o worker cliente.

Consumidores: IA de Axel/Luis, worker de Ramón/Jean y Passport de Juan. El job refiere un `evidenceId` y conserva versión de análisis. Retries no duplican evidencia ni eventos. Las migraciones y permisos remotos se revisan y autorizan aparte.
