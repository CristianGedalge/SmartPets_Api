# Notificaciones de sesión

SmartPet utiliza Firebase Cloud Messaging para avisar al ciudadano cuando inicia o cierra sesión en la aplicación móvil.

## Configuración

El backend requiere las siguientes variables juntas:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

`FIREBASE_PRIVATE_KEY` se escribe en una sola línea y conserva los caracteres literales `\\n`. Si las tres variables están vacías, el envío push queda deshabilitado y la autenticación continúa funcionando.

Este módulo no crea tablas ni necesita una migración. El token se usa durante la petición y no se almacena.

## Notificar el inicio

`POST /api/v1/notificaciones/inicio-sesion`

Requiere un JWT de ciudadano.

```json
{
  "token": "token-fcm-del-dispositivo"
}
```

Envía el aviso de bienvenida directamente al token recibido.

## Cerrar sesión

`POST /api/v1/notificaciones/cierre-sesion`

Requiere un JWT de ciudadano.

```json
{
  "token": "token-fcm-del-dispositivo"
}
```

Envía el aviso de cierre directamente. Un fallo del proveedor de notificaciones no impide el cierre local del móvil.
