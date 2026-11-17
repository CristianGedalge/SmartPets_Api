# Mascotas y especies

Implementar las entidades especie, mascota y foto_mascota del requerimiento adjunto, sin raza_id, tabla raza ni distintivos. Roles ADMIN, CIUDADANO y ENCARGADO gestionan solo mascotas propias; usuario_id se obtiene del JWT. Los recursos ajenos o inactivos responden 404.

Especies requiere autenticación. Mascotas permite registro multipart, listado propio paginado, consulta, PATCH de datos, baja lógica y endpoints independientes de fotografías. No implementar extravíos, avistamientos ni IA.

Fotos: campo multipart `fotos`, 1–5 archivos JPEG/PNG/WebP de hasta 5 MiB; comprobar firma binaria y MIME, además de los límites de Multer. Cloudinary valida y almacena las imágenes; PostgreSQL conserva referencias. Una mascota activa conserva al menos una foto y como máximo cinco. La primera foto es principal, las nuevas no sustituyen la principal; al borrarla se promueve la foto restante más antigua (desempate por id).

Peso opcional positivo con hasta dos decimales y máximo 9999.99; edad opcional entera no negativa. Sexo opcional MACHO, HEMBRA o DESCONOCIDO. PATCH no admite fotos, estado, usuario_id ni propietario. Los campos opcionales anulables permiten null en JSON; los requeridos no.

Las altas y cambios de referencias son transaccionales. Bloquear la fila de mascota para serializar adiciones, bajas y selección de principal. Las subidas tienen identificadores generados por el servidor y una intención de limpieza persistida antes de contactar Cloudinary. Confirmar referencias elimina esas intenciones en la misma transacción. Tras fallo o caída se limpian después de 15 minutos. El borrado de foto confirma referencia y tarea de limpieza en una transacción y reintenta Cloudinary hasta completar; la baja lógica de mascota conserva fotos.

Criterios: aislamiento entre propietarios; tres roles admitidos; campos adicionales rechazados; validación de multipart y archivos; ninguna sexta foto bajo concurrencia; exactamente una principal; baja lógica; recuperación de fallos parciales; migración reversible sin alterar la inicial; pruebas, lint y build.
