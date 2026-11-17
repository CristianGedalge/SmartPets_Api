# Avistamientos

Un usuario autenticado de cualquiera de los tres roles publica una mascota vista sin conocer su identidad. No requiere mascota ni alerta asociada. No se implementan IA, coincidencias, distancias, notificaciones ni chat.

Datos obligatorios: especie existente, descripción (1-2000 caracteres), fecha y hora del avistamiento no futura con zona horaria, dirección/referencia (1-255 caracteres), punto del mapa y 1-5 fotos JPEG/PNG/WebP de hasta 5 MiB. Propietario, estado y claves de almacenamiento los asigna el servidor.

Listar públicamente solo ACTIVOS; historial propio incluye ACTIVO, CERRADO y CANCELADO. Detalle no activo solo para su autor. Solo el autor edita datos/fotos o cierra/cancela un ACTIVO; otros usuarios, incluido ADMIN, reciben 404 al intentar modificarlo. Un reporte cerrado no vuelve a editarse: 409. Cerrar significa finalizar el reporte, no confirmar identidad ni rescate. Conservar fotos y el historial al cerrar/cancelar.

Paginación limit/offset y orden createdAt DESC, id ASC. Respuestas no exponen email, teléfono, hash, usuarioId ni storageKey. Mantener mínimo una foto y máximo cinco incluso con operaciones simultáneas. Subidas con compensación persistida y eliminación remota reintentable. Cambios de esquema por migración; no modificar tablas existentes.

Aceptación: publicar válido, rechazar datos inválidos/futuros/metadatos ajenos y fotos inválidas; proteger JWT, propiedad y estados; consultar públicas/propias; editar; agregar/eliminar fotos; cerrar/cancelar; manejar fallos de almacenamiento sin referencias rotas. Integración móvil con selección manual/GPS sin coordenadas visibles.
