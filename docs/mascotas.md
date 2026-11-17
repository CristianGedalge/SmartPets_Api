# Mascotas y especies: guía HTTP y Postman

Base URL: `http://localhost:3000/api/v1`. Todos los endpoints de esta guía requieren un JWT. Importa [smartpet_api.postman_collection.json](smartpet_api.postman_collection.json), ejecuta Login y utiliza la variable `access_token` que ya guarda la colección. Los roles ADMIN, CIUDADANO y ENCARGADO gestionan únicamente sus propias mascotas; ADMIN no tiene acceso global a este módulo.

## Preparación

Desde `smartpet_api`, configura PostgreSQL y JWT como antes. Agrega a tu `.env` privado los valores de `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` obtenidos en tu consola Cloudinary. No son variables del frontend. No se necesita upload preset: el backend realiza subidas firmadas. Las tres variables son obligatorias y se validan al iniciar en `src/config/cloudinary.config.ts`. Si falta una o está vacía, el backend no inicia e indica su nombre. Esta validación local no comprueba las credenciales contra Cloudinary.

```bash
npm run migration:run
npm run start:dev
```

La nueva migración es `1794859200000-MascotasSchema.ts`; conserva la migración inicial. Crea `especie` (Perro y Gato), `mascota`, `foto_mascota` y la tabla técnica `archivo_pendiente_eliminacion`. El esquema no se sincroniza automáticamente.

## 1. Listar especies

`GET {{baseUrl}}/especies`

En Authorization selecciona Bearer Token: `{{access_token}}`. Sin body. Responde `200` con un arreglo de `{ id, nombre }`, ordenado por nombre. Usa un id real como `especieId` al registrar la mascota.

## 2. Registrar mascota y fotografías

`POST {{baseUrl}}/mascotas`

En **Body → form-data**, agrega:

| Key | Tipo en Postman | Ejemplo | Obligatorio |
| --- | --- | --- | --- |
| `nombre` | Text | Luna | Sí |
| `especieId` | Text | 1 | Sí, debe existir |
| `razaNombre` | Text | Mestizo | No; texto libre |
| `sexo` | Text | HEMBRA | No; MACHO, HEMBRA o DESCONOCIDO |
| `color` | Text | Blanco y negro | No |
| `pesoKg` | Text | 4.25 | No; mayor que cero, máximo 9999.99 y dos decimales |
| `edadAproximadaMeses` | Text | 12 | No; entero entre 0 y 2147483647 |
| `fotos` | File | Selecciona una imagen local | Sí; entre 1 y 5 archivos |

Repite la key `fotos` o selecciona varios archivos para enviar más de uno. Se admiten JPEG, PNG y WebP de hasta **5 MiB por archivo**. Se comprueban MIME y firma binaria; Cloudinary debe poder decodificar la imagen. SVG y GIF no están permitidos. No configures manualmente `Content-Type`: Postman añade el boundary de multipart.

No envíes `usuarioId`, `usuario_id`, `estado`, `esPrincipal`, `storageKey`, `raza_id` ni `distintivos`. La identidad viene del JWT y el servidor controla los metadatos de las fotos.

Responde `201` con la mascota y sus relaciones `especie` y `fotos`. Las propiedades JSON usan camelCase; las columnas PostgreSQL usan snake_case. Las fotos incluyen `id`, `mascotaId`, `url`, `storageKey`, `proveedor`, `esPrincipal` y `createdAt`. `pesoKg` se devuelve como número o null. La primera foto enviada es principal. La colección guarda `mascota_id` y `foto_id` de la respuesta para las peticiones siguientes.

## 3. Listar mis mascotas

`GET {{baseUrl}}/mascotas/mis-mascotas?limit=10&offset=0`

Sin body. Responde `200` con un arreglo de mascotas activas del usuario autenticado, con especie y fotografías. Los parámetros son opcionales; sus valores predeterminados son 10 y 0. No devuelve el total. Las fotos se ordenan con la principal primero y después por antigüedad e id.

## 4. Consultar mi mascota

`GET {{baseUrl}}/mascotas/{{mascota_id}}`

Sin body. Responde `200`. Un UUID inexistente, una mascota desactivada o una mascota ajena responden `404`, también para ADMIN. Un UUID mal formado responde `400`.

## 5. Actualizar datos de mi mascota

`PATCH {{baseUrl}}/mascotas/{{mascota_id}}`

En **Body → raw → JSON**:

```json
{
  "nombre": "Luna",
  "especieId": 1,
  "razaNombre": "Mestizo",
  "sexo": "HEMBRA",
  "color": "Blanco y negro",
  "pesoKg": 4.5,
  "edadAproximadaMeses": 13
}
```

Todos los campos son opcionales en PATCH. Omitirlos conserva el valor. Los campos anulables (`razaNombre`, `sexo`, `color`, `pesoKg`, `edadAproximadaMeses`) admiten null en JSON para limpiar el dato. `nombre` y `especieId` no admiten null. Responde `200` con el recurso actualizado. No envíes fotos a este endpoint: los campos adicionales se rechazan con `400`.

## 6. Agregar fotografías

`POST {{baseUrl}}/mascotas/{{mascota_id}}/fotos`

En **Body → form-data**, agrega únicamente `fotos` de tipo **File**. Admite de 1 a 5 archivos por solicitud, respetando el máximo **total de cinco** por mascota. No acepta campos de texto. Responde `201` con la mascota actualizada. La principal existente se mantiene. Las solicitudes concurrentes se serializan mediante un bloqueo de la mascota y se vuelve a comprobar el total antes de insertar.

## 7. Eliminar una fotografía

`DELETE {{baseUrl}}/mascotas/{{mascota_id}}/fotos/{{foto_id}}`

Sin body. La foto debe pertenecer a esa mascota y esta al usuario autenticado. No se permite borrar la última foto de una mascota activa (`400`). Al borrar la principal se promueve la foto restante más antigua, con desempate por id.

Respuesta `200`:

```json
{
  "eliminada": true,
  "limpiezaPendiente": false
}
```

La referencia SQL ya fue eliminada. Si el borrado remoto falla, `limpiezaPendiente` será `true`; la tarea queda persistida y se reintenta. Un segundo DELETE de esa referencia responde `404`.

## 8. Desactivar una mascota

`DELETE {{baseUrl}}/mascotas/{{mascota_id}}`

Sin body. Responde `200` con `estado: false`. Es una baja lógica: conserva la fila y las fotografías. La mascota deja de aparecer en mis-mascotas y sus endpoints de consulta, actualización y fotos responden `404`. Este campo no indica extravío. No existe endpoint de reactivación en este módulo.

## Fallos parciales y limpieza

PostgreSQL y Cloudinary no comparten una transacción. Antes de subir cada lote, el backend persiste identificadores de archivos propios en `archivo_pendiente_eliminacion`, disponibles para limpieza después de 15 minutos. Confirmar la mascota y las referencias elimina esas intenciones en la misma transacción. Si falla una subida, el commit o el proceso se interrumpe, las intenciones sobreviven y permiten borrar los archivos sin referencia. No hace falta que el cliente conozca los storage keys.

Eliminar una fotografía encola el borrado remoto junto con la eliminación SQL y la promoción de principal. Después se intenta borrar en Cloudinary; si falla, la cola vuelve a intentarlo cinco minutos más tarde. Un archivo ya ausente se considera eliminado. El worker procesa tareas al iniciar y cada 60 segundos, con bloqueo `SKIP LOCKED` para evitar procesarlas simultáneamente entre instancias. Comprueba que el archivo no tenga referencia antes de destruirlo. Las credenciales son necesarias para completar la limpieza, que requiere una instancia de la API en ejecución. Con la API detenida, las tareas se conservan hasta el próximo inicio.

No se modifican datos de otras mascotas ni se envían archivos reales a Cloudinary durante las pruebas automatizadas.

## Errores esperados

| HTTP | Motivo |
| --- | --- |
| 400 | DTO inválido, campos adicionales, especie inexistente, archivo no permitido, sin fotos, más de cinco o intento de borrar la última |
| 401 | JWT ausente/incorrecto/expirado o usuario desactivado |
| 403 | Rol distinto de ADMIN, CIUDADANO y ENCARGADO en rutas de mascotas |
| 404 | Mascota ajena, inexistente o inactiva; foto que no pertenece a la mascota |
| 413 | Una foto supera 5 MiB |
| 503 | Fallo de subida a Cloudinary o intento de confirmar subidas cuya intención ya expiró y se limpió |

## Archivos de la implementación

| Carpeta / archivo | Contenido creado o actualizado |
| --- | --- |
| `src/modules/especies/` | `entities/especie.entity.ts`, `especies.controller.ts`, `especies.service.ts`, `especies.module.ts` |
| `src/modules/mascotas/entities/` | `mascota.entity.ts`, `foto-mascota.entity.ts` |
| `src/modules/mascotas/dto/` | `create-mascota.dto.ts`, `update-mascota.dto.ts`, `add-fotos.dto.ts`, `mascota.dto.spec.ts` |
| `src/modules/mascotas/` | `mascotas.controller.ts`, `mascotas.service.ts`, `mascotas.module.ts` |
| `src/modules/almacenamiento/` | `almacenamiento.module.ts`, `cloudinary.service.ts` y su prueba, `image-upload.ts` y su prueba, `limpieza-archivos.service.ts` y su prueba |
| `src/modules/almacenamiento/entities/` | `archivo-pendiente.entity.ts` |
| `src/migrations/1794859200000-MascotasSchema.ts` | Migración nueva; la migración inicial no se modifica |
| `src/app.module.ts` | Registro de los módulos Especies y Mascotas |
| `src/config/jwt.config.ts` | Solo formato: salto de línea final para pasar lint |
| `.env.example` | Variables Cloudinary vacías, sin credenciales reales |
| `package.json`, `test/jest-e2e.json` | Compatibilidad de Jest con el paquete ESM de configuración; sin dependencias nuevas |
| `test/app.e2e-spec.ts` | Pruebas HTTP, JWT y PostgreSQL aislado, sustituyendo el test de plantilla |
| `specs/mascotas/` | `spec.md`, `design.md`, `tasks.md` |
| `README_BACKEND.md`, `docs/README.md`, `docs/mascotas.md` | Alcance actual, tablas y guía HTTP; README original conservado |
| `docs/smartpet_api.postman_collection.json` | Carpeta Mascotas y especies, variables y ocho solicitudes nuevas |

## Ejecución de pruebas

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Las pruebas unitarias cubren DTO, imágenes, firma Cloudinary y reintentos de limpieza con mocks. Las pruebas e2e usan la API Nest real, JWT real y PostgreSQL; crean y eliminan un esquema temporal `smartpet_test_<uuid>`, sin modificar tablas existentes ni usar Cloudinary real. Requieren PostgreSQL accesible y permiso para crear esquemas y funciones de prueba en la base configurada. Son opt-in:

```powershell
$env:SMARTPET_TEST_DATABASE='1'
npm run test:e2e -- --runInBand
```

En Bash: `SMARTPET_TEST_DATABASE=1 npm run test:e2e -- --runInBand`. Sin esa variable la suite PostgreSQL se omite explícitamente. Se reemplazó la prueba e2e de plantilla `Hello World!` porque el backend actual no expone esa ruta.

Referencias de implementación: [API de Cloudinary](https://cloudinary.com/documentation/image_upload_api_reference), [firmas de autenticación](https://cloudinary.com/documentation/authentication_signatures) y [carga de archivos de NestJS](https://docs.nestjs.com/techniques/file-upload).
