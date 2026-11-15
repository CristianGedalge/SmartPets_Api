# Tasks: `establecimientos`

## Fase 1 — DTOs, Módulo, Servicio y Controlador
- [x] **T-01:** Implementar `CreateEstablecimientoDto` y `UpdateEstablecimientoDto` con `class-validator`.
- [x] **T-02:** Importar `UsuariosModule` en `EstablecimientosModule` para validar `usuarioId` en `EstablecimientosService`.
- [x] **T-03:** Implementar `EstablecimientosService` (`create`, `findAll`, `findOne`, `update`, `remove` con baja lógica `estado = false`).
- [x] **T-04:** Implementar `EstablecimientosController` con `ParseUUIDPipe`, `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(RolNombre.ADMIN)`.

## Fase 2 — Pruebas y Documentación
- [x] **T-05:** Actualizar pruebas unitarias en `establecimientos.service.spec.ts` y `establecimientos.controller.spec.ts`.
- [x] **T-06:** Documentar los endpoints del CRUD de `establecimientos` en `docs/smartpet_api.postman_collection.json` y `docs/README.md`.
- [x] **T-07:** Ejecutar ESLint, `npm run build` y `npm test` para verificar que todo pase sin errores.
