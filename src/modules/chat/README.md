# Chat: modelo de datos

El módulo contiene las entidades `Conversacion`, `ParticipanteConversacion` y `Mensaje`, registradas en TypeORM mediante `ChatModule`.

| Tabla | Relaciones y datos |
| --- | --- |
| `conversacion` | `alerta_id` o `avistamiento_id` (exactamente uno), fecha de creación |
| `participante_conversacion` | Conversación, usuario, última lectura opcional, fecha de incorporación; usuario único por conversación |
| `mensaje` | Participante remitente, texto de 1 a 4000 caracteres no blancos, fecha de envío |

Un mensaje identifica a su conversación y autor mediante el participante. No duplica esos identificadores en columnas separadas. Los índices permiten consultar conversaciones por publicación, la bandeja por usuario y mensajes por participante/fecha/id.

La baja lógica de usuarios/publicaciones conserva el historial. Las claves foráneas impiden eliminarlos físicamente mientras estén referenciados. Borrar físicamente una conversación elimina sus participantes y mensajes.

Migración: `src/migrations/1794960000000-ChatSchema.ts`. El esquema se aplica con `npm run migration:run`.

El modelo todavía no proporciona endpoints, envío de mensajes, WebSockets ni interfaces. El servicio futuro deberá comprobar participantes desde JWT, limitar a dos usuarios distintos, deducir al autor de la publicación y recuperar conversaciones existentes con bloqueo transaccional. El esquema por sí solo no impone esas reglas de aplicación. No hay paquetes ni variables nuevos.

[Especificación](../../../specs/chat/spec.md) · [Relaciones y diseño](../../../specs/chat/design.md)
