# Especificación Funcional: Módulo `usuarios` (Panel Admin)

## 1. Propósito
Permitir a los usuarios con rol `ADMIN` gestionar las cuentas de usuario registradas en el sistema desde el panel administrativo: listar usuarios, consultar el detalle de un usuario, actualizar sus datos básicos/estado y dar de baja lógica (`estado = false`).

## 2. Alcance
- **Controlador protegido:** Todos los endpoints de `/api/v1/usuarios` requieren `@AuthRole(RolNombre.ADMIN)`.
- **Operaciones:**
  1. `GET /api/v1/usuarios`: Listar todos los usuarios con su `rol` y su `establecimiento` (si aplica), sin exponer `passwordHash`.
  2. `GET /api/v1/usuarios/:id`: Obtener el detalle de un usuario por UUID.
  3. `PATCH /api/v1/usuarios/:id`: Actualizar datos básicos (`nombre`, `apellido`, `telefono`, `fotoUrl`) o `estado` (`true`/`false`).
  4. `DELETE /api/v1/usuarios/:id`: Baja lógica del usuario cambiando `estado` a `false`.

## 3. Criterios de Aceptación (CA)
- **CA-01 (Listar usuarios):** `GET /api/v1/usuarios` retorna la lista de usuarios ordenada por fecha de creación descendente sin `passwordHash`.
- **CA-02 (Obtener por ID):** `GET /api/v1/usuarios/:id` retorna el usuario o `404 Not Found` si no existe (y `400 Bad Request` si el ID no es UUID válido).
- **CA-03 (Actualizar usuario):** `PATCH /api/v1/usuarios/:id` actualiza con `preload` los campos enviados (`nombre`, `apellido`, `telefono`, `fotoUrl`, `estado`), retornando el usuario actualizado o `404 Not Found`.
- **CA-04 (Baja lógica en DELETE):** `DELETE /api/v1/usuarios/:id` cambia `estado = false` con `preload` y retorna el usuario desactivado (`200 OK`) o `404 Not Found` si no existe.
