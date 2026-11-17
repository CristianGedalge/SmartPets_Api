# Tareas

- [x] Revisar requerimiento, README y módulos existentes.
- [x] Definir contrato, estados y reglas de visibilidad.
- [x] Crear entidad, enum, DTO y migración adicional.
- [x] Implementar controller, servicio y guard opcional manteniendo orden de métodos.
- [x] Probar propiedad, privacidad, estados, fechas y concurrencia.
- [x] Actualizar README_BACKEND, HTTP y Postman.
- [x] Ejecutar lint, build, pruebas unitarias y e2e aisladas.

## Verificación

- Lint y build terminan sin errores. `npm test -- --runInBand`: 15 suites, 119 pruebas correctas, incluidas 47 del módulo nuevo.
- `SMARTPET_TEST_DATABASE=1 npm run test:e2e -- --runInBand`: dos suites, 21 pruebas correctas (12 de alertas y 9 de mascotas), con JWT y PostgreSQL real aislado.
- Dos publicaciones simultáneas de la misma mascota: 201 y 409; índice parcial también rechaza una inserción SQL duplicada con 23505.
- Resolver/cancelar simultáneamente: un único cierre consistente y un conflicto. Estados terminales no permiten editarse ni cerrarse otra vez.
- Público no devuelve historial, alertas ocultas ni mascotas inactivas. Dueño accede a historial con JWT. Datos privados del usuario y claves de fotos se excluyen explícitamente.
- Probados fecha no futura, zonas horarias, rangos, campos extra, propiedad en los tres roles, principal/null, paginación y baja de mascota.
- Migración adicional aplicada/revertida únicamente en esquemas temporales; los esquemas se eliminaron al finalizar. Migraciones anteriores intactas. No se aplicó a la base habitual.
- Verificados enlaces de documentación, siete solicitudes Postman y mismo orden de métodos públicos entre controller y service. README original y contratos existentes conservados.
