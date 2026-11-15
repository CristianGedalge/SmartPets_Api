# Tasks: `auth`

## Fase 1 — Infraestructura Base (PostgreSQL + TypeORM + App)
- [x] **T-01:** Completar `.env.example` con variables de app, PostgreSQL y JWT (`PORT`, `DB_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`).
- [x] **T-02:** Configurar `ConfigModule.forRoot({ isGlobal: true })` y `TypeOrmModule.forRootAsync(...)` en `src/app.module.ts` (`synchronize: false`).
- [x] **T-03:** Configurar `DataSource` para TypeORM CLI en `src/config/database.config.ts` y scripts de migración en `package.json`.
- [x] **T-04:** Generar migración inicial en `src/migrations/` para tablas `rol`, `usuario`, `establecimiento` e insertar los roles iniciales (`ADMIN`, `CIUDADANO`, `ENCARGADO`).
- [x] **T-05:** Configurar prefijo global `/api/v1` y `ValidationPipe` global en `src/main.ts`.

## Fase 2 — Implementación de `auth`
- [x] **T-06:** Crear `RegisterDto` (con `RegisterEstablecimientoDto` opcional anidado) y `LoginDto` con `class-validator`.
- [x] **T-07:** Configurar `JwtModule.registerAsync`, `PassportModule`, `JwtStrategy` y `JwtAuthGuard` en `src/modules/auth/`.
- [x] **T-08:** Implementar `AuthService.register()` con normalización de email, verificación de duplicado (`409`), hash con `bcrypt` y transacción para crear `usuario` (`CIUDADANO` o `ENCARGADO`) + `establecimiento` (cuando aplica).
- [x] **T-09:** Implementar `AuthService.login()` validando `estado === true`, hash `bcrypt` y firma de JWT (`401` si falla).
- [x] **T-10:** Implementar `AuthService.getProfile()` y los endpoints en `AuthController` (`POST /register`, `POST /login`, `GET /profile`).

## Fase 3 — Pruebas y Verificación
- [x] **T-11:** Escribir pruebas unitarias en `auth.service.spec.ts` cubriendo CA-01 a CA-06 (mocks de repositorios, `DataSource`, `JwtService`, `bcrypt`).
- [x] **T-12:** Actualizar `auth.controller.spec.ts` para probar `register`, `login` y `profile`.
- [x] **T-13:** Ejecutar `npm run lint`, `npm run build` y `npm test` y verificar que todo pase.
