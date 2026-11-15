# Especificación Funcional: Módulo `roles` (Panel Admin)

## 1. Propósito
Permitir al `ADMIN` consultar los roles disponibles del sistema (`ADMIN`, `CIUDADANO`, `ENCARGADO`) para poblar selectores o filtros en el panel administrativo.

## 2. Alcance
- **Controlador protegido:** `/api/v1/roles` requiere `@AuthRole(RolNombre.ADMIN)`.
- **Operaciones:**
  1. `GET /api/v1/roles`: Listar todos los roles ordenados por `id` ascendente.

## 3. Criterios de Aceptación (CA)
- **CA-01 (Listar roles):** `GET /api/v1/roles` retorna el arreglo de roles (`id`, `nombre`) ordenado por `id` ascendente.
- **CA-02 (Seguridad):** Solo usuarios autenticados con rol `ADMIN` pueden acceder a `/api/v1/roles`.
