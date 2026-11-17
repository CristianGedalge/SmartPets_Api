# Diseño

Nuevo módulo alertas-extravio, entidad AlertaExtravio y enum EstadoAlerta. Tabla alerta_extravio con UUID, FK mascota_id restrictiva para preservar historial, descripción opcional, fecha_extravio, numeric(10,8) y numeric(11,8), estado varchar(20) default ACTIVA, fecha_resolucion nullable, auditoría timestamptz. Nueva migración crea checks de estados, coordenadas y coherencia de fechaResolucion, índice de mascota/historial y estado/creación e índice único parcial por mascota_id WHERE estado='ACTIVA'. No modificar migraciones anteriores ni synchronize.

DTO Create: mascotaId, descripcion?, fechaExtravio, latitud, longitud. Fecha validada con ISO estricto y zona horaria, regla no-futura y comprobación defensiva en servicio. Update usa PartialType/OmitType quitando mascotaId; solo descripcion es anulable. Body vacío validado para resolver/cancelar, sin campos aceptados. Reutilizar PaginationDto sin modificarlo.

Controller y service en orden create, findAll, findMine, findOne, update, resolve, cancel; auxiliares privados al final. @AuthRole y @GetUser('sub') existentes para operaciones privadas. Un guard opcional del módulo reutiliza AuthGuard('jwt') solo cuando se envía Authorization, sin modificar AuthModule ni JwtStrategy. Detalle usa req.user?.sub opcional; no llama a GetUser cuando es público.

GET /alertas-extravio público y GET /alertas-extravio/mis-alertas privado: 200 arreglos paginados (limit=10, offset=0), orden createdAt DESC e id ASC. GET /:id: 200 con regla de visibilidad. POST /alertas-extravio: 201. PATCH /:id, /:id/resolver y /:id/cancelar: 200. Rutas estáticas antes de :id.

400 DTO inválido/UUID/fecha futura; 401 autenticación ausente o inválida en rutas privadas; 403 rol distinto de los tres; 404 mascota ajena/inexistente/inactiva al crear o alerta fuera de visibilidad; 409 alerta duplicada o intento de modificar/cerrar estado no activo. Guardar y cambiar estado dentro de transacción; bloquear mascota, comprobar propietario y luego bloquear alerta. La comprobación normal de duplicado devuelve 409; cualquier fallo de persistencia no manejado sigue el filtro global existente.

Respuesta explícita allowlist: id, mascotaId, descripcion, fechaExtravio, latitud/longitud como números, estado, fechaResolucion, createdAt, updatedAt; mascota con id, nombre, especie (id,nombre), razaNombre, sexo, color, edadAproximadaMeses, estado y fotoPrincipal (id,url) o null. Nunca usuario, usuarioId, email, teléfono, passwordHash, storageKey o fotos secundarias. Relación a la foto principal actual de la mascota; no instantánea histórica ni archivos nuevos.

Pruebas unitarias de DTO, visibilidad y propiedad/transiciones; HTTP real con JWT/PostgreSQL en esquema temporal, Cloudinary simulado, nueva migración aplicada/revertida únicamente allí. Documentación en README_BACKEND.md (conservar README original), docs/alertas-extravio.md, docs/README.md y colección Postman.
