# Diseno API

Tabla animal_resguardado: id UUID, mascota_id UUID unico FK RESTRICT, establecimiento_id UUID FK RESTRICT, estado varchar20 EN_RESGUARDO/ADOPTADO, created_at/updated_at. Tabla publicacion_adopcion: id UUID, animal_resguardado_id unico FK RESTRICT, descripcion text, requisitos text nullable, estado varchar20 PUBLICADA/RETIRADA/ADOPTADA, fecha_adopcion timestamptz nullable y created_at/updated_at. CHECK estado/fecha; indices de listados. No modifica tablas existentes. MascotasService acepta contexto institucional interno, valida y bloquea establecimiento activo del propietario dentro de la transaccion antes de crear asociacion. AnimalesResguardadosService verifica contexto antes de delegar edicion/fotos; publicaciones bloquean establecimiento, mascota, animal y publicacion en ese orden. Adoptado no se republica. Lectura institucional devuelve {id,estado,establecimientoId,mascota,publicacion,createdAt,updatedAt}; ficha mascota sin storageKey/usuarioId.

Prefijo /api/v1; limit/offset, arreglos con orden createdAt DESC,id ASC.
- POST /animales-resguardados: ENCARGADO, multipart DTO de mascotas y fotos; 201 ficha institucional.
- GET /animales-resguardados: ENCARGADO, listados propios activos (incluye adoptados).
- GET /animales-resguardados/:id: ENCARGADO, detalle propio.
- PATCH /animales-resguardados/:id: ENCARGADO, JSON DTO de edicion mascota; 200 ficha.
- POST /animales-resguardados/:id/fotos: ENCARGADO, multipart fotos sin metadata; 201 ficha.
- DELETE /animales-resguardados/:id/fotos/:fotoId: ENCARGADO, conserva minimo una; 200 {eliminada,limpiezaPendiente}.
- POST /adopciones: ENCARGADO, JSON {animalResguardadoId,descripcion,requisitos?}; 201 publicacion; 409 si ya existe.
- GET /adopciones: publico, solo disponibles.
- GET /adopciones/mis-publicaciones: ENCARGADO, historial propio.
- GET /adopciones/:id: publico solo disponible; 404 fuera del catalogo.
- PATCH /adopciones/:id: ENCARGADO, JSON {descripcion?,requisitos?}, 200; terminal ADOPTADA no editable.
- PATCH /adopciones/:id/publicar, /retirar, /adoptar: ENCARGADO, cuerpo {}; 200. publicar solo RETIRADA, retirar/adoptar solo PUBLICADA; 409 en transicion invalida.

Publicacion devuelve id,animalResguardadoId,descripcion,requisitos,estado,fechaAdopcion,createdAt,updatedAt,mascota {id,nombre,especie,razaNombre,sexo,color,pesoKg,edadAproximadaMeses,fotos [{id,url,esPrincipal}]},establecimiento {id,nombre,tipo,direccion,telefono,horarioAtencion}. Sin usuario/credenciales/coordenadas visibles. 400 datos/fotos, 401 sin JWT, 403 rol/establecimiento, 404 ajeno/inexistente, 409 estado/duplicado, 413 tamano, 503 almacenamiento. Las mutaciones no aceptan estado ni claves institucionales salvo animalResguardadoId en creacion de publicacion.
