# Modelo del chat

Modelar conversaciones privadas relacionadas con exactamente una alerta de extravío o un avistamiento. Cada conversación tiene participantes usuarios y mensajes de texto enviados por un participante. Una persona puede participar en varias conversaciones y no se repite dentro de la misma. Lectura por participante mediante ultima_lectura_at nullable.

El modelo base incluye entidades TypeORM, módulo registrado y migración. La extensión [implementacion.md](implementacion.md) agrega endpoints JWT y gateway Socket.IO: autentica al usuario, comprueba pertenencia, deduce al autor de la publicación, impide conversaciones consigo mismo, mantiene dos participantes y recupera la conversación existente para la misma publicación y pareja. Estas reglas de autorización se implementan en los servicios, no quedan garantizadas únicamente por las tablas.

La base garantiza FK válidas, una sola referencia de publicación por conversación, participantes únicos y mensajes no vacíos de hasta 4000 caracteres. No se aceptan remitentes sueltos: mensaje referencia un participante existente, lo que determina también su conversación. Las bajas de usuarios/publicaciones no borran historiales; la eliminación física explícita de una conversación elimina sus participantes y mensajes.
