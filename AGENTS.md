# AGENTS.md — `smartpet_api`

Backend de SmartPet: NestJS + TypeScript, PostgreSQL con TypeORM, autenticación JWT.

## Metodología (SDD)

No escribir código sin spec previa. `specs/` es la fuente de verdad.

1. `specs/<modulo>/spec.md`: objetivo, requisitos, reglas de negocio y criterios de aceptación.
2. `specs/<modulo>/design.md`: entidades, rutas, DTOs, códigos HTTP y errores.
3. `specs/<modulo>/tasks.md`: tareas pequeñas y ordenadas.
4. Implementar y verificar contra los criterios de aceptación.

- No inventar endpoints, campos ni reglas que no estén en la spec.
- Si algo es ambiguo, preguntar al usuario.
- Bugfixes pequeños y refactors sin cambio de contrato no requieren spec nueva.

## Estructura

- `src/modules/<modulo>/` — un módulo por dominio (`module`, `controller`, `service`, `dto/`, `entities/`)
- `src/migrations/` — migraciones de TypeORM
- `test/` — pruebas e2e
- `specs/` — specs, designs y tasks

## Comandos

```bash
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e
```

## Convenciones

- Prefijo global `/api/v1`. Auth con JWT.
- Validar entradas con `class-validator` + `ValidationPipe`.
- Cambios de esquema solo con migraciones.
- Variables en `.env` (documentadas con su descripción en `.env.example`); nunca commitear `.env` ni credenciales.
- Sin Swagger: el contrato se documenta en `design.md` y en Postman.
- Controllers solo manejan HTTP; la lógica va en los services.
- Pedir confirmación antes de agregar dependencias o cambiar un contrato de API.

## Definition of Done

1. Cumple la spec y el design.
2. Tiene pruebas de los criterios de aceptación y casos de error.
3. `npm run lint`, `npm run build` y `npm test` pasan.