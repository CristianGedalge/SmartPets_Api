# Diseño

`NotificacionesModule` contiene el controlador, el servicio de mensajes de sesión y `FirebaseMessagingService`.

- `POST /notificaciones/inicio-sesion`: JWT de ciudadano, cuerpo `{ token }`. Envía el push de bienvenida al token recibido.
- `POST /notificaciones/cierre-sesion`: JWT de ciudadano, cuerpo `{ token }`. Envía el push de cierre al token recibido.
- Ambos responden `{ enviado: boolean }` sin revelar información del proveedor.

Variables privadas: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`. Se configuran las tres o ninguna. La clave admite `\n` escapados.

El token solo vive durante la petición. No se almacena en PostgreSQL.
