# Tareas

- [x] Definir contrato y esquema.
- [x] Implementar registro institucional y adopciones.
- [x] Integrar gestion web y catalogo publico.
- [x] Pruebas HTTP de permisos, transacciones, estados y regresiones.
- [x] Documentacion, Postman, lint y compilacion.
- [x] Aplicar migracion local y comprobar endpoints.

Verificado: lint y build de ambos proyectos; 151 pruebas unitarias y 39 HTTP contra PostgreSQL aislado; flujo web completo en Edge con perfil temporal y API simulada. Migracion aplicada: animal_resguardado y publicacion_adopcion. API real: GET /adopciones HTTP 200; acceso institucional sin JWT HTTP 401.
