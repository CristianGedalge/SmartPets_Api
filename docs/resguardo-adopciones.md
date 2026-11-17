# Animales resguardados y adopciones

Dos tablas nuevas: `animal_resguardado` asocia una mascota al establecimiento que la cuida; `publicacion_adopcion` guarda su anuncio y estado. Las mascotas personales anteriores no se convierten automaticamente. Migracion: `1794952800000-ResguardoAdopcionesSchema.ts`.

## Registro institucional

Solo ENCARGADO de veterinaria/refugio activo, prefijo `/api/v1` y Bearer JWT:

| Metodo | Ruta | Cuerpo |
| --- | --- | --- |
| POST | /animales-resguardados | Multipart DTO de mascota + fotos |
| GET | /animales-resguardados | limit/offset |
| GET | /animales-resguardados/:id | Sin cuerpo |
| PATCH | /animales-resguardados/:id | JSON parcial de ficha |
| POST | /animales-resguardados/:id/fotos | Multipart fotos |
| DELETE | /animales-resguardados/:id/fotos/:fotoId | Sin cuerpo |

Registro requiere nombre, especieId y 1-5 fotos JPEG/PNG/WebP de hasta 5 MiB; admite razaNombre, sexo, color, pesoKg y edadAproximadaMeses. No enviar usuarioId, establecimientoId ni estado. El servidor deduce la institucion y crea mascota, fotos y asociacion en una transaccion con compensacion de Cloudinary. Respuesta: id institucional, mascota, establecimientoId, estado y resumen de publicacion.

## Publicaciones

| Metodo | Ruta | Acceso / cuerpo |
| --- | --- | --- |
| POST | /adopciones | ENCARGADO; animalResguardadoId, descripcion y requisitos opcionales |
| GET | /adopciones | Publico; limit/offset, solo disponibles |
| GET | /adopciones/mis-publicaciones | ENCARGADO; historial propio |
| GET | /adopciones/:id | Publico; solo disponibles |
| PATCH | /adopciones/:id | ENCARGADO; descripcion y/o requisitos |
| PATCH | /adopciones/:id/retirar | ENCARGADO; {} |
| PATCH | /adopciones/:id/publicar | ENCARGADO; {} |
| PATCH | /adopciones/:id/adoptar | ENCARGADO; {} |

Descripcion obligatoria (1-2000 caracteres), requisitos opcionales (hasta 2000). Una publicacion por animal; al retirarla puede editarse y republicarse. Marcar adoptado exige PUBLICADA y actualiza atomicamente publicacion ADOPTADA, animal ADOPTADO y fechaAdopcion del servidor. Esa ficha pasa a solo lectura; tampoco puede editarse usando los endpoints personales de mascotas.

El catalogo omite anuncios retirados/adoptados, mascotas desactivadas e instituciones o encargados inactivos. Devuelve fotos, caracteristicas y contacto institucional, sin datos personales del encargado, storageKey ni hashes. Las personas contactan directamente al establecimiento. Sin solicitudes, datos de adoptantes, chat, verificacion ni IA.

Errores: 400 datos/fotos, 401 sesion, 403 rol/institucion, 404 ajeno/inexistente, 409 duplicado/transicion, 413 tamano y 503 almacenamiento. Ningun rol puede gestionar otra institucion por estas rutas.

[Contrato detallado](../specs/resguardo-adopciones/design.md). Postman contiene las carpetas Animales resguardados y Adopciones.
