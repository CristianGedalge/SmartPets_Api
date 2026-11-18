# Chat

Conversaciones privadas vinculadas con una alerta o un avistamiento. El módulo contiene entidades TypeORM, servicio transaccional, controlador JWT, eventos y gateway Socket.IO.

- `conversacion`: exactamente una publicación de contexto.
- `participante_conversacion`: usuario único dentro de una conversación y última lectura.
- `mensaje`: participante remitente, contenido y fecha.

El servidor deduce al destinatario, comprueba pertenencia y reutiliza conversaciones existentes bajo bloqueo de la publicación. La escritura de mensajes se serializa por conversación y admite reintentos idempotentes con UUID del cliente. Lectura y cursores se limitan a la conversación del usuario.

El gateway verifica JWT y usuario activo; une cada socket únicamente a su sala privada y lo desconecta al expirar el token. Los avisos después del commit no incluyen contenido: el historial se recupera por HTTP. No hay grupos, adjuntos, presencia ni push. Para varias instancias se necesita un adaptador compartido.

[Contrato HTTP y Socket.IO](../../../docs/chat.md) · [Modelo](../../../specs/chat/design.md) · [Implementación](../../../specs/chat/implementacion.md)
