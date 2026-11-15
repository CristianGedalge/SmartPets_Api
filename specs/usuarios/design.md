# Diseño Técnico: Módulo `usuarios`

## 1. Arquitectura de Componentes
- `src/modules/usuarios/dto/update-usuario.dto.ts`: Validaciones con `class-validator` y normalización `.trim()` con `@Transform`.
- `src/modules/usuarios/usuarios.service.ts`: Lógica de consulta y actualización con `preload` sobre `Usuario`.
- `src/modules/usuarios/usuarios.controller.ts`: Endpoints REST bajo `/api/v1/usuarios` protegidos con `@AuthRole(RolNombre.ADMIN)`.

## 2. Contratos de Endpoints

### 2.1 `GET /api/v1/usuarios`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Response `200 OK`:** Arreglo de usuarios con `rol` y `establecimiento`.

### 2.2 `GET /api/v1/usuarios/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Params:** `id` (UUID)
- **Response `200 OK`:** Objeto `usuario` con `rol` y `establecimiento`.

### 2.3 `PATCH /api/v1/usuarios/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Request Body:**
```jsonc
{
  "nombre": "María Elena",                    // Opcional (máx. 100 caracteres)
  "apellido": "López",                        // Opcional (máx. 100 caracteres)
  "telefono": "70011223",                     // Opcional (máx. 20 caracteres)
  "fotoUrl": "https://ejemplo.com/nueva.jpg", // Opcional
  "estado": true                              // Opcional (boolean)
}
```
- **Response `200 OK`:** Objeto `usuario` actualizado.

### 2.4 `DELETE /api/v1/usuarios/:id`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Acción:** Actualiza `usuario.estado = false` (baja lógica).
- **Response `200 OK`:** Objeto `usuario` con `estado: false`.
