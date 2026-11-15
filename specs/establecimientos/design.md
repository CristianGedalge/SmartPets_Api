# Diseño Técnico: Módulo `establecimientos`

## 1. Arquitectura de Componentes
- `src/modules/establecimientos/dto/update-establecimiento.dto.ts`: Validaciones con `class-validator` y `.trim()` con `@Transform`.
- `src/modules/establecimientos/establecimientos.service.ts`: Lógica de consulta y actualización con `preload` sobre `Establecimiento`.
- `src/modules/establecimientos/establecimientos.controller.ts`: Endpoints REST bajo `/api/v1/establecimientos` protegidos con `@AuthRole(RolNombre.ADMIN)`.

## 2. Contratos de Endpoints

### 2.1 `GET /api/v1/establecimientos`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Response `200 OK`:** Arreglo de establecimientos con datos públicos de `usuario`.

### 2.2 `GET /api/v1/establecimientos/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Params:** `id` (UUID)
- **Response `200 OK`:** Objeto `establecimiento` con datos públicos de `usuario`.

### 2.3 `PATCH /api/v1/establecimientos/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Request Body:**
```jsonc
{
  "nombre": "Veterinaria San Roque Central", // Opcional
  "tipo": "VETERINARIA",                     // Opcional ("VETERINARIA" | "REFUGIO")
  "descripcion": "Atención 24 horas",        // Opcional
  "direccion": "Av. Busch #455",              // Opcional
  "latitud": -17.783500,                     // Opcional
  "longitud": -63.182200,                    // Opcional
  "telefono": "33445577",                    // Opcional
  "horarioAtencion": "Lun-Dom 24 hrs",       // Opcional
  "estado": true                             // Opcional (boolean)
}
```
- **Response `200 OK`:** Objeto `establecimiento` actualizado.

### 2.4 `DELETE /api/v1/establecimientos/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Acción:** Actualiza `establecimiento.estado = false` (baja lógica).
- **Response `200 OK`:** Objeto `establecimiento` con `estado: false`.
