# Chat privado: APIs y tiempo real

Extiende el modelo con APIs JWT para participantes de cualquier rol activo; móvil ciudadano. No se publican identificadores de propietarios en alertas/avistamientos: el backend obtiene al autor desde la publicación. Crear conversación bloquea la publicación en transacción, rechaza autochat, autor inactivo o contexto no disponible y reutiliza la conversación de la misma pareja. Después de cerrar una publicación, las conversaciones existentes conservan historial y comunicación mientras ambos usuarios sigan activos. No hay grupos, adjuntos, borrado, presencia ni push.

## Contrato HTTP /api/v1

- POST /chat/conversaciones: {alertaId} o {avistamientoId}, UUID; devuelve conversación propia.
- GET /chat/conversaciones: limit 1-50 (20), offset entero >=0; arreglo propio ordenado por última actividad/id.
- GET /chat/conversaciones/:id: resumen propio o 404.
- GET /chat/conversaciones/:id/mensajes: limit 1-50 (30), antesDe o despuesDe UUID de mensaje de esa conversación. {items,hayMas}, items en orden cronológico. Sin cursor devuelve los últimos mensajes; después permite recuperar todos los perdidos; antes carga historial antiguo.
- POST /chat/conversaciones/:id/mensajes: {id UUID generado por cliente,contenido texto no blanco hasta 4000}. El ID garantiza reintento sin duplicados; repetir el mismo ID/cuerpo/autor devuelve el mensaje guardado, cualquier reutilización incompatible es 409. Datos del remitente siempre desde JWT. Escritura serializada por conversación; createdAt monotónico con precisión de milisegundos.
- PATCH /chat/conversaciones/:id/lectura: {mensajeId UUID}; avanza lectura hasta el mensaje realmente mostrado de esa conversación, nunca retrocede. Devuelve {leido:true}. No marca nuevos mensajes que lleguen simultáneamente.

Resumen: {id,contexto:{tipo:ALERTA|AVISTAMIENTO,id,titulo,estado},interlocutor:{nombre},ultimoMensaje:{id,contenido,createdAt,esPropio}|null,noLeidos}. Mensaje: {id,contenido,createdAt,esPropio}. Sin email, teléfono, hash, storageKey ni datos del adoptante. 400 DTO/cursor/contexto, 401 sin sesión, 404 conversación/contexto ajeno o inexistente, 409 autochat/id reutilizado y 403 destinatario inactivo al enviar.

## Socket.IO

Dependencias autorizadas por usuario: @nestjs/websockets y @nestjs/platform-socket.io 11, socket.io 4; móvil socket_io_client 3. Namespace /chat sobre el mismo origen/puerto de API_URL, path /socket.io. Handshake auth {token}; no token por URL. Verificar firma/expiración y usuario activo. Cada socket entra únicamente a user:<sub> deducido por servidor. No se acepta unión a salas enviada por cliente. Desconectar al vencer token y liberar temporizadores/listeners.

Tras commit emitir chat:actualizado {conversacionId} a los participantes; no enviar contenido ni datos personales en esos avisos. Al conectar/reconectar el móvil consulta historial por HTTP y elimina duplicados por ID. HTTP sigue siendo fuente persistente. No depender de recibir todos los eventos. Implementación para una instancia; varias instancias requerirían un adaptador compartido de Socket.IO.

## Verificación

Permisos HTTP/WS, datos privados omitidos, creación simultánea idempotente por contexto/pareja, recuperación paginada, reintento de envío, lectura acotada/monótona, cambios de ciclo de vida y descarte completo al cerrar sesión. No requiere migración adicional: reutiliza el modelo aplicado. Actualizar Postman y documentación.
