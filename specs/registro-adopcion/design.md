# Diseño

Tabla adopcion: id uuid PK, animal_resguardado_id uuid UNIQUE NOT NULL FK RESTRICT a animal_resguardado, nombre_adoptante varchar(150), telefono_adoptante varchar(20), fecha_adopcion date, observaciones text nullable, created_at timestamptz default now(). Nueva migración reversible, sin modificar registros históricos.

PATCH /api/v1/adopciones/:id/adoptar conserva el id de la publicación y ahora requiere {nombreAdoptante,telefonoAdoptante,fechaAdopcion,observaciones?}. DTO transforma espacios extremos y valida tipos, límites y fecha calendario completa. 400 cuerpo inválido/adicionales, 401 sin sesión, 403 rol/establecimiento, 404 ajeno, 409 estado/duplicado. La fecha histórica de publicacion_adopcion se conserva como timestamptz a medianoche UTC de la fecha recibida, y adopcion usa date.

Solo findMine y findOwned consultan y serializan registroAdopcion: {id,nombreAdoptante,telefonoAdoptante,fechaAdopcion,observaciones,createdAt} o null. Las rutas públicas no consultan ni serializan esta información. Sin endpoint nuevo de edición/borrado ni backfill de adoptantes antiguos.
