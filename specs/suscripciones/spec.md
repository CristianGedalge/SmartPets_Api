# Suscripciones por pago

## Objetivo

Garantizar que todo ciudadano comience con acceso gratuito y que los planes superiores solo se activen después de registrar un pago propio.

## Reglas de negocio

- El administrador crea, edita, activa y desactiva planes.
- El administrador puede consultar la suscripción de un ciudadano, pero no asignarla ni renovarla.
- El registro de un ciudadano crea una suscripción activa al plan Gratis.
- Solo el flujo de pago del ciudadano puede reemplazar el plan Gratis por un plan de pago.
- Al activar una nueva suscripción se cancela cualquier suscripción activa anterior.
- Las suscripciones existentes asignadas manualmente por administradores dejan de estar activas.
- Las funciones con cupo requieren una suscripción activa y vigente.

## Criterios de aceptación

- No existe una operación administrativa para asignar suscripciones.
- Un ciudadano nuevo recibe el plan Gratis.
- `POST /pagos` activa durante 30 días el plan pagado.
- Una suscripción gratuita automática concede los cupos definidos para el plan Gratis.
- El administrador conserva la consulta de suscripciones y la gestión de planes.

