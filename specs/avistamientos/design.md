# Diseño y contrato HTTP

Tablas avistamiento (UUID, usuario_id FK RESTRICT, especie_id FK RESTRICT, descripcion text, direccion varchar255, fecha_avistamiento timestamptz, latitud numeric10,8, longitud numeric11,8, estado varchar20, created_at/updated_at) y avistamiento_foto (UUID, avistamiento_id FK CASCADE, url, storage_key único, proveedor, es_principal, created_at). CHECK para estados/rangos, índice único parcial de principal e índices de listas. Mismos límites de fotos que mascotas. No tabla de coincidencias ni embeddings.

Prefijo /api/v1. Rutas:
- POST /avistamientos: JWT, multipart (especieId, descripcion, direccion, fechaAvistamiento ISO8601 con zona, latitud, longitud, fotos); 201 ficha.
- GET /avistamientos: público, limit/offset; 200 arreglo de activos.
- GET /avistamientos/mis-avistamientos: JWT, limit/offset; 200 historial propio.
- GET /avistamientos/:id: público activo, JWT opcional para historial propio; 200 ficha o 404.
- PATCH /avistamientos/:id: JWT, JSON con subconjunto de los campos de creación excepto fotos; 200 ficha. No permite null ni campos extra.
- PATCH /avistamientos/:id/cerrar y /cancelar: JWT, cuerpo vacío {}; 200 ficha.
- POST /avistamientos/:id/fotos: JWT, multipart solo fotos; 201 ficha.
- DELETE /avistamientos/:id/fotos/:fotoId: JWT; 200 {eliminada:true,limpiezaPendiente:boolean}.

Ficha: id, especieId, especie {id,nombre}, descripcion, direccion, fechaAvistamiento, latitud/longitud numéricas, estado, createdAt, updatedAt, esPropio (boolean), fotos [{id,url,esPrincipal,createdAt}]. Listado público sin JWT devuelve esPropio=false; el móvil usa historial para administración.

Errores 400 validación/especie/fotos mínimas-máximas; 401 sesión; 404 inexistente/ajeno; 409 estado terminal; 413 tamaño; 503 almacenamiento. Bloqueo pesimista del reporte para todas las mutaciones y compensaciones antes de subir. El limpiador debe comprobar referencias de fotos de mascotas y avistamientos antes de destruir un archivo.
