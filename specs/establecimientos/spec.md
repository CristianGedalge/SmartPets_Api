# Especificación Funcional: Módulo `establecimientos`

## 1. Propósito
Permitir la gestión administrativa de los establecimientos (`VETERINARIA` y `REFUGIO`) registrados en SmartPet: listar todos los establecimientos con los datos de su encargado, consultar el detalle por UUID, actualizar su información/estado y realizar la baja lógica (`estado = false`).

## 2. Alcance
- **Controlador protegido:** Todos los endpoints de `/api/v1/establecimientos` requieren `@AuthRole(RolNombre.ADMIN)`.
- **Operaciones:**
  1. `GET /api/v1/establecimientos`: Listar todos los establecimientos con los datos públicos de su `usuario` encargado.
  2. `GET /api/v1/establecimientos/:id`: Obtener el detalle de un establecimiento por su UUID.
  3. `PATCH /api/v1/establecimientos/:id`: Actualizar datos del establecimiento (`nombre`, `tipo`, `descripcion`, `direccion`, `latitud`, `longitud`, `telefono`, `horarioAtencion`, `estado`).
  4. `DELETE /api/v1/establecimientos/:id`: Baja lógica del establecimiento cambiando `estado` a `false`.

## 3. Criterios de Aceptación (CA)
- **CA-01 (Listar establecimientos):** `GET /api/v1/establecimientos` retorna la lista ordenada por `createdAt` descendente con los datos públicos de `usuario` (sin `passwordHash`).
- **CA-02 (Obtener por ID):** `GET /api/v1/establecimientos/:id` retorna el establecimiento o `404 Not Found` si no existe.
- **CA-03 (Actualizar establecimiento):** `PATCH /api/v1/establecimientos/:id` actualiza los campos enviados con `preload` y retorna el establecimiento actualizado o `404 Not Found`.
- **CA-04 (Baja lógica en DELETE):** `DELETE /api/v1/establecimientos/:id` cambia `estado = false` con `preload` y retorna el establecimiento desactivado (`200 OK`) o `404 Not Found`.
