# Spec: pago simulado con tarjeta

## Objetivo

Demostrar la compra de un plan por parte de un ciudadano mediante una tarjeta de prueba, sin conectarse a una pasarela ni almacenar datos sensibles.

## Reglas

- El flujo se identifica claramente como demostracion y no procesa dinero real.
- La tarjeta aprobada es `4242 4242 4242 4242` y la rechazada es `4000 0000 0000 0002`.
- No se aceptan otras tarjetas para evitar que el usuario introduzca una tarjeta real.
- Se validan titular, algoritmo de Luhn, fecha futura y CVV de 3 o 4 digitos.
- Nunca se guardan el numero completo, la fecha ni el CVV.
- El pago conserva metodo, ultimos cuatro digitos y una referencia de demostracion.
- El plan solo se activa si la simulacion resulta aprobada.

## Criterios de aceptacion

- La tarjeta aprobada crea el pago y activa el plan durante 30 dias.
- La tarjeta rechazada o vencida no modifica la suscripcion.
- La respuesta confirma que es una simulacion e incluye referencia y ultimos cuatro digitos.
