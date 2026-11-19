# Notificaciones push de sesión

## Objetivo

Enviar mediante Firebase Cloud Messaging una notificación de bienvenida después del inicio de sesión y una notificación de confirmación cuando el ciudadano cierra la sesión manualmente.

## Reglas

- Solo un ciudadano autenticado puede solicitar estos mensajes.
- Cada solicitud incluye el token FCM actual y el backend lo usa inmediatamente.
- El inicio de sesión envía `Bienvenido a SmartPet`.
- El cierre de sesión envía `Sesión cerrada`.
- Los errores de Firebase no invalidan la sesión ni impiden cerrarla.
- La configuración privada de Firebase vive en variables de entorno y nunca se expone al móvil.
- No se guarda el token ni se crea una entidad o historial de notificaciones.

## Criterios de aceptación

- El módulo no agrega tablas ni migraciones.
- Los endpoints validan el token recibido y usan mensajes definidos por el servidor.
- Un fallo de Firebase no impide iniciar ni cerrar la sesión local.
- Credenciales incompletas hacen fallar el arranque con un mensaje de configuración; las tres variables vacías deshabilitan el envío.
