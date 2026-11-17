# Documentación de APIs — `smartpet_api`

Base URL local: `http://localhost:3000/api/v1`

El módulo de alertas de extravío está documentado en [Alertas de extravío: HTTP y Postman](alertas-extravio.md). Incluye siete endpoints, listado público, historial propio y cierre de alertas; la colección contiene la carpeta **Alertas de extravío**.

El módulo de mascotas y especies está documentado en [Mascotas: HTTP y Postman](mascotas.md), con los ocho endpoints, formularios multipart, edición JSON, permisos por propietario y recuperación de fallos de Cloudinary. La colección Postman incluye la carpeta **Mascotas y especies**.

Para importar en Postman: **Import** → selecciona [smartpet_api.postman_collection.json](./smartpet_api.postman_collection.json).  
*(Los requests `Register` y `Login` guardan automáticamente `access_token` en las variables de la colección para probar endpoints protegidos sin copiar el token manualmente).*

---

## Módulo: `Auth`

### 1A. Registro de Ciudadano — `POST /auth/register`
- **Acceso:** Público
- **Body (`application/json`):**
```jsonc
{
  "nombre": "Ana",
  "apellido": "Pérez",
  "email": "ana@ejemplo.com",
  "password": "MiPassword123",
  "telefono": "70012345",                   // Opcional (máx. 20 caracteres)
  "fotoUrl": "https://ejemplo.com/foto.jpg" // Opcional
}
```
- **Respuestas:** `201 Created`, `400 Bad Request`, `409 Conflict`

### 1B. Registro de Encargado + Establecimiento — `POST /auth/register`
- **Acceso:** Público
- **Body (`application/json`):**
```jsonc
{
  "nombre": "Carlos",
  "apellido": "Gómez",
  "email": "carlos@veterinaria.com",
  "password": "MiPassword123",
  "telefono": "71122334",                         // Opcional (máx. 20 caracteres)
  "fotoUrl": "https://ejemplo.com/encargado.jpg", // Opcional
  "establecimiento": {                            // Opcional (si se incluye, asigna rol ENCARGADO)
    "nombre": "Veterinaria San Roque",
    "tipo": "VETERINARIA",                        // Enum: "VETERINARIA" | "REFUGIO"
    "descripcion": "Atención médica veterinaria", // Opcional
    "direccion": "Av. Busch #450",
    "latitud": -17.783327,                        // Opcional (-90 a 90)
    "longitud": -63.182140,                       // Opcional (-180 a 180)
    "telefono": "33445566",
    "horarioAtencion": "Lun-Sab 08:00-20:00"      // Opcional (máx. 150 caracteres)
  }
}
```
- **Respuestas:** `201 Created`, `400 Bad Request`, `409 Conflict`

### 2. Inicio de sesión — `POST /auth/login`
- **Acceso:** Público
- **Body (`application/json`):**
```json
{
  "email": "ana@ejemplo.com",
  "password": "MiPassword123"
}
```
- **Respuestas:** `200 OK`, `400 Bad Request`, `401 Unauthorized`

### 3. Perfil actual — `GET /auth/profile`
- **Acceso:** Privado (`Authorization: Bearer <access_token>`)
- **Body:** Sin body
- **Respuestas:** `200 OK`, `401 Unauthorized`

### 4. Actualizar mi propio perfil — `PATCH /auth/profile`
- **Acceso:** Privado (`Authorization: Bearer <access_token>`)
- **Body (`application/json`):**
```jsonc
{
  "nombre": "Ana María",                         // Opcional (máx. 100 caracteres)
  "apellido": "Pérez",                           // Opcional (máx. 100 caracteres)
  "telefono": "70099999",                        // Opcional (máx. 20 caracteres)
  "fotoUrl": "https://ejemplo.com/nueva.jpg",    // Opcional
  "password": "NuevoPassword123",                // Opcional (8-72 caracteres)
  "establecimiento": {                           // Opcional (si es ENCARGADO)
    "nombre": "Veterinaria San Roque",           // Opcional
    "tipo": "VETERINARIA",                       // Opcional ("VETERINARIA" | "REFUGIO")
    "descripcion": "Atención médica veterinaria",// Opcional
    "direccion": "Av. Busch #450",               // Opcional
    "latitud": -17.783327,                       // Opcional
    "longitud": -63.182140,                      // Opcional
    "telefono": "33445566",                      // Opcional
    "horarioAtencion": "Lun-Sab 08:00-20:00"     // Opcional
  }
}
```
- **Respuestas:** `200 OK`, `400 Bad Request`, `401 Unauthorized`

---

## Módulo: `Roles (Admin)`

> Requiere `Authorization: Bearer <access_token>` con rol `ADMIN`.

### 1. Listar roles — `GET /roles`
- **Body:** Sin body
- **Respuestas:** `200 OK`, `401 Unauthorized`, `403 Forbidden`

---

## Módulo: `Usuarios (Admin)`

> Todos los endpoints de `/usuarios` requieren `Authorization: Bearer <access_token>` con rol `ADMIN`.

### 1. Listar usuarios — `GET /usuarios`
- **Body:** Sin body
- **Respuestas:** `200 OK`

### 2. Obtener usuario por ID — `GET /usuarios/:id`
- **Body:** Sin body
- **Respuestas:** `200 OK`, `400 Bad Request` (UUID inválido), `404 Not Found`

### 3. Actualizar usuario — `PATCH /usuarios/:id`
- **Body (`application/json`):**
```jsonc
{
  "nombre": "María Elena",                    // Opcional (máx. 100 caracteres)
  "apellido": "López",                        // Opcional (máx. 100 caracteres)
  "telefono": "70011223",                     // Opcional (máx. 20 caracteres)
  "fotoUrl": "https://ejemplo.com/nueva.jpg", // Opcional
  "estado": true                              // Opcional (boolean)
}
```
- **Respuestas:** `200 OK`, `400 Bad Request`, `404 Not Found`

### 4. Desactivar usuario (Baja lógica) — `DELETE /usuarios/:id`
- **Body:** Sin body (actualiza `estado: false`)
- **Respuestas:** `200 OK`, `404 Not Found`

---

## Módulo: `Establecimientos (Admin)`

> Todos los endpoints de `/establecimientos` requieren `Authorization: Bearer <access_token>` con rol `ADMIN`.

### 1. Listar establecimientos — `GET /establecimientos`
- **Body:** Sin body
- **Respuestas:** `200 OK`

### 2. Obtener establecimiento por ID — `GET /establecimientos/:id`
- **Body:** Sin body
- **Respuestas:** `200 OK`, `400 Bad Request` (UUID inválido), `404 Not Found`

### 3. Actualizar establecimiento — `PATCH /establecimientos/:id`
- **Body (`application/json`):**
```jsonc
{
  "nombre": "Veterinaria San Roque Central", // Opcional (máx. 150 caracteres)
  "tipo": "VETERINARIA",                     // Opcional ("VETERINARIA" | "REFUGIO")
  "descripcion": "Atención 24 horas",        // Opcional
  "direccion": "Av. Busch #455",             // Opcional (máx. 255 caracteres)
  "latitud": -17.783500,                     // Opcional (-90 a 90)
  "longitud": -63.182200,                    // Opcional (-180 a 180)
  "telefono": "33445577",                    // Opcional (máx. 20 caracteres)
  "horarioAtencion": "Lun-Dom 24 hrs",       // Opcional (máx. 150 caracteres)
  "estado": true                             // Opcional (boolean)
}
```
- **Respuestas:** `200 OK`, `400 Bad Request`, `404 Not Found`

### 4. Desactivar establecimiento (Baja lógica) — `DELETE /establecimientos/:id`
- **Body:** Sin body (actualiza `estado: false`)
- **Respuestas:** `200 OK`, `404 Not Found`


## Avistamientos

API y contratos completos en [specs/avistamientos/design.md](../specs/avistamientos/design.md).

Publicar: `POST /avistamientos`, Bearer JWT, multipart con `especieId`, `descripcion`, `direccion`, `fechaAvistamiento` (ISO8601 con hora y zona), `latitud`, `longitud` y `fotos` (1-5 JPEG/PNG/WebP, hasta 5 MiB por imagen). No enviar propietario, estado, mascota, alerta ni claves de Cloudinary.

- `GET /avistamientos?limit=10&offset=0`: comunidad activa, sin JWT.
- `GET /avistamientos/mis-avistamientos`: historial propio, con JWT.
- `GET /avistamientos/:id`: activo publico; historial solo para autor autenticado.
- `PATCH /avistamientos/:id`: JSON parcial de datos, solo autor de ACTIVO.
- `PATCH /avistamientos/:id/cerrar` y `/cancelar`: cuerpo `{}`; cierre irreversible del reporte, conserva historial.
- `POST /avistamientos/:id/fotos`: multipart solo `fotos`.
- `DELETE /avistamientos/:id/fotos/:fotoId`: conserva al menos una foto; indica `limpiezaPendiente` si el borrado remoto requiere reintento.

Los tres roles gestionan solamente reportes propios. Fechas no futuras, punto obligatorio, coordenadas solo internas del cliente. Estados: ACTIVO, CERRADO, CANCELADO. No se implementan IA ni coincidencias. La carpeta Avistamientos de Postman incluye estas nueve peticiones.


## Resguardo institucional y adopciones

[Registro de animales de veterinarias/refugios y catalogo de adopciones](resguardo-adopciones.md). Postman incluye las dos carpetas nuevas.
