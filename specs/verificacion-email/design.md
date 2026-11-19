# Design: verificacion de correo

## Persistencia

- `usuario.email_verificado boolean NOT NULL DEFAULT false`.
- `verificacion_email`: una fila por usuario con `codigo_hash`, `salt`, `expira_en`, `intentos`, `enviado_en` y FK con borrado en cascada.
- La migracion marca como verificadas las cuentas que existian antes de esta funcionalidad.

## Contratos

- `POST /api/v1/auth/register`: para ciudadano devuelve `{ requiereVerificacion, email, emailEnmascarado, correoEnviado }`; para encargado conserva `{ access_token, usuario }`.
- `POST /api/v1/auth/login`: con ciudadano pendiente devuelve el mismo estado pendiente despues de validar la contrasena.
- `POST /api/v1/auth/email/verify`: recibe `{ email, codigo }` y devuelve `{ access_token, usuario }`.
- `POST /api/v1/auth/email/resend`: recibe `{ email }` y devuelve `{ enviado: true }` cuando el nuevo codigo fue enviado.

Los endpoints son publicos. Los DTO normalizan el correo y aceptan exclusivamente codigos numericos de seis digitos.

## Correo

Se usa Brevo mediante `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` y `BREVO_SENDER_NAME`. `PUBLIC_WEB_URL` define la base de los enlaces legales y usa `https://smartpet.gedalge.dev` por defecto.
