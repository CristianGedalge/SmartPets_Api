# Design: pago simulado con tarjeta

`POST /api/v1/pagos` recibe `planId`, `titular`, `numeroTarjeta`, `mesExpiracion`, `anioExpiracion` y `cvv`. El DTO normaliza espacios del numero y valida formatos. El servicio ejecuta las reglas de simulacion antes de abrir la transaccion que reemplaza la suscripcion.

La tabla `pago` incorpora `metodo_pago`, `ultimos_cuatro` y `referencia`. La referencia se genera en el servidor. Los datos sensibles solo viven durante la peticion.
