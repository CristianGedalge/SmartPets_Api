# Diseño

## Rutas

- `GET /planes`, `POST /planes`, `PATCH /planes/:id`: gestión administrativa de planes.
- `GET /suscripciones/usuarios/:usuarioId`: consulta administrativa.
- `GET /pagos/planes`: planes disponibles para el ciudadano.
- `POST /pagos`: registra el pago del ciudadano y activa el plan por 30 días.

Se retira `PUT /suscripciones/usuarios/:usuarioId`.

## Persistencia

- `pago.suscripcion_id` demuestra el pago que originó una suscripción superior al plan Gratis.
- Se elimina `suscripcion.asignada_por` porque no existe asignación administrativa.
- Una migración cancela suscripciones activas asignadas manualmente por administradores y conserva las gratuitas automáticas.

