# Tareas

- [x] Crear entidades, relaciones e índices de chat.
- [x] Registrar módulo y migración reversible.
- [x] Verificar restricciones y reversión en esquema aislado PostgreSQL.
- [x] Build, lint y regresión; documentar alcance del modelo.

Modelo base verificado con 11 pruebas de esquema. Migración ChatSchema1794960000000 aplicada a la base local.

- [x] Endpoints JWT, apertura serializada e idempotencia de mensajes.
- [x] Historial paginado, lectura acotada y pendientes privados.
- [x] Gateway Socket.IO con JWT, salas privadas y desconexión por expiración.
- [x] Pruebas HTTP/WebSocket reales con PostgreSQL aislado y documentación Postman.

Extensión verificada: 163 pruebas unitarias y 63 de integración, incluidas 8 de chat HTTP/Socket.IO. Dependencias WebSocket autorizadas por el usuario. Sin migración adicional.
