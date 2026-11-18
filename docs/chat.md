# Chat privado de alertas y avistamientos

Requiere JWT de un usuario activo. El destinatario se obtiene desde la publicación y solo los participantes acceden a la conversación. Las bajas o cierres de publicaciones conservan conversaciones anteriores. No se admite autochat ni grupos.

## HTTP

Prefijo `/api/v1/chat/conversaciones`:

| Método | Ruta relativa | Cuerpo / consulta |
| --- | --- | --- |
| POST | `/` | `{ "alertaId": "uuid" }` o `{ "avistamientoId": "uuid" }` |
| GET | `/` | `limit` (1-50, defecto 20), `offset` |
| GET | `/:id` | Resumen propio |
| GET | `/:id/mensajes` | `limit` (1-50, defecto 30), `antesDe` o `despuesDe` (ID de mensaje propio de esa conversación) |
| POST | `/:id/mensajes` | `{ "id": "uuid-del-cliente", "contenido": "Texto" }` |
| PATCH | `/:id/lectura` | `{ "mensajeId": "uuid-del-último-mensaje-mostrado" }` |

Abrir una conversación reutiliza la existente para la misma pareja/publicación, incluso con solicitudes simultáneas. Enviar admite reintentar el mismo ID/cuerpo/autor sin duplicarlo. No reutilizar ese UUID para otros textos. Se aceptan de 1 a 4000 caracteres no blancos. Los mensajes se devuelven `{items,hayMas}`, en orden cronológico; sin cursor se obtienen los últimos. Usar `antesDe` para anteriores y `despuesDe` sucesivamente para recuperar páginas perdidas.

Resumen: `id`, `contexto` (`tipo`, `id`, `titulo`, `estado`), `interlocutor.nombre`, `ultimoMensaje` y `noLeidos`. Mensaje: `id`, `contenido`, `createdAt`, `esPropio`. No se devuelven correo, teléfono, hash ni claves de almacenamiento. La marca de lectura no retrocede ni incluye mensajes posteriores al indicado.

Errores: 400 cuerpo/cursor/paginación; 401 sesión; 404 recurso ajeno/inexistente o contexto no disponible; 403 participante desactivado al enviar; 409 autochat o ID incompatible.

## Tiempo real

Socket.IO 4 sobre el mismo host y puerto HTTP; namespace `/chat`, path `/socket.io`. Autenticar con `auth: {token: accessToken}`; nunca poner token en URL. El servidor verifica firma, expiración y usuario activo y asigna sala privada desde su identidad. No hay un evento para que el cliente se una a una sala arbitraria.

Evento recibido `chat:actualizado` con `{conversacionId}` después del commit de un mensaje. No lleva el texto: el cliente recupera el historial con los endpoints autenticados. Al reconectar, consultar desde el último ID conocido hasta agotar `hayMas`. El socket se desconecta al expirar el JWT.

El móvil utiliza WebSocket y recupera mensajes al volver del segundo plano. Las notificaciones push con la app cerrada no están incluidas. El adaptador actual funciona en una instancia de backend; un despliegue con varias instancias necesita un adaptador compartido (por ejemplo Redis) para distribuir eventos.

No hay migración adicional: utiliza `ChatSchema1794960000000`. Instalar dependencias con `npm install` y reiniciar backend. El móvil requiere `flutter pub get` y Hot Restart. No cambian env ni puertos; con USB, el mismo `adb reverse tcp:3000 tcp:3000` sirve para HTTP y WebSocket.

[Diseño y reglas](../specs/chat/implementacion.md).
