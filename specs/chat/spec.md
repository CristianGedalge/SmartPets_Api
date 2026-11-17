# Modelo del chat

Modelar conversaciones privadas relacionadas con exactamente una alerta de extravío o un avistamiento. Cada conversación tiene participantes usuarios y mensajes de texto enviados por un participante. Una persona puede participar en varias conversaciones y no se repite dentro de la misma. Lectura por participante mediante ultima_lectura_at nullable.

Esta entrega incluye entidades TypeORM, módulo registrado y migración. No expone endpoints, gateway WebSocket, notificaciones ni pantallas. Las futuras operaciones deberán autenticar al usuario, comprobar pertenencia, deducir al autor de la publicación, impedir conversaciones consigo mismo, mantener dos participantes y recuperar una conversación existente para la misma publicación y pareja. Estas reglas de autorización se implementarán con los servicios, no quedan garantizadas únicamente por estas tablas.

La base garantiza FK válidas, una sola referencia de publicación por conversación, participantes únicos y mensajes no vacíos de hasta 4000 caracteres. No se aceptan remitentes sueltos: mensaje referencia un participante existente, lo que determina también su conversación. Las bajas de usuarios/publicaciones no borran historiales; la eliminación física explícita de una conversación elimina sus participantes y mensajes.
