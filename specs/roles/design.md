# Diseño Técnico: Módulo `roles`

## 1. Arquitectura de Componentes
- `src/modules/roles/roles.service.ts`: Consulta el repositorio `Rol` (`findAll`).
- `src/modules/roles/roles.controller.ts`: Expone `GET /api/v1/roles` protegido con `@AuthRole(RolNombre.ADMIN)`.

## 2. Contratos de Endpoints

### 2.1 `GET /api/v1/roles`
- **Headers:** `Authorization: Bearer <access_token>` (Rol `ADMIN`)
- **Response `200 OK`:**
```json
[
  { "id": 1, "nombre": "ADMIN" },
  { "id": 2, "nombre": "CIUDADANO" },
  { "id": 3, "nombre": "ENCARGADO" }
]
```
