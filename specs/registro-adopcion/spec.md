# Registro de entrega en adopción

El encargado propietario de una publicación PUBLICADA registra la entrega a cualquier persona, sin exigir cuenta del adoptante. Se reciben nombre completo (1-150 caracteres), teléfono (1-20 caracteres), fecha de entrega YYYY-MM-DD válida y observaciones opcionales (máximo 2000 caracteres). No se recibe ni almacena encargado_id, adoptante_usuario_id ni establecimiento_id en adopcion.

Debe existir como máximo una adopción por animal. Crear la adopción y cambiar animal/publicación a ADOPTADO/ADOPTADA es atómico, manteniendo los bloqueos actuales para impedir duplicados concurrentes. El estado es terminal. Los registros antiguos adoptados se conservan sin inventar datos del tutor.

Los datos del adoptante aparecen únicamente en respuestas privadas de publicaciones propias. Nunca se incorporan al catálogo público. Se conservan los permisos y comprobaciones del establecimiento. Sustituye la exclusión previa de datos de adoptantes y la fecha automática del servidor de specs/resguardo-adopciones.
