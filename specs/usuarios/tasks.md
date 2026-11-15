# Tasks: `usuarios`

## Fase 1 — Autorización por Roles
- [x] **T-01:** Crear decorador `@Roles` en `src/modules/auth/decorators/roles.decorator.ts` y `RolesGuard` en `src/modules/auth/guards/roles.guard.ts`.

## Fase 2 — DTOs, Servicio y Controlador de `usuarios`
- [x] **T-02:** Implementar `CreateUsuarioDto` y `UpdateUsuarioDto` con `class-validator`.
- [x] **T-03:** Importar `RolesModule` en `UsuariosModule` para consultar roles en `UsuariosService`.
- [x] **T-04:** Implementar `UsuariosService` (`create`, `findAll`, `findOne`, `update`, `remove` con baja lógica `estado = false`).
- [x] **T-05:** Implementar `UsuariosController` con `ParseUUIDPipe`, `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(RolNombre.ADMIN)`.

## Fase 3 — Pruebas y Documentación
- [x] **T-06:** Actualizar pruebas unitarias en `usuarios.service.spec.ts` y `usuarios.controller.spec.ts`.
- [x] **T-07:** Documentar los endpoints del CRUD de `usuarios` en `docs/smartpet_api.postman_collection.json` y `docs/README.md`.
- [x] **T-08:** Ejecutar `npm run build` y `npm test` para verificar que todo pase sin errores.
