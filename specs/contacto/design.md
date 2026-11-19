# Diseño

Nuevo `ContactoModule` con controller, service y DTO. `POST /contacto` público bajo el prefijo global `/api/v1`. `contactConfig` lee `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` y `CONTACT_RECIPIENT_EMAIL`; este último usa el correo confirmado como valor por defecto. El service llama `https://api.brevo.com/v3/smtp/email` mediante `fetch`, timeout de 10 segundos, remitente verificado, destinatario administrativo y `replyTo` del visitante.

DTO: `nombre` 2-100, `email` válido hasta 150, `asunto` 3-120 sin saltos de línea, `mensaje` 10-2000 y honeypot opcional vacío. Rate limit en memoria por IP, 3 solicitudes/15 minutos; documentar que producción con varias instancias requiere un almacén compartido.

Pruebas unitarias del DTO y service: payload, escape, proveedor ausente, error HTTP y rate limit. Documentar variables, endpoint y Postman. Sin migración.
