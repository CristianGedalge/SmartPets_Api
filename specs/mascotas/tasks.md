# Tareas

- [x] Revisar módulos, DTO, guards, decoradores, TypeORM, migración y documentación existentes.
- [x] Definir contrato y recuperación de fallos parciales.
- [x] Crear entidades y migración adicional con especies iniciales.
- [x] Implementar almacenamiento Cloudinary y limpieza persistente.
- [x] Implementar DTO, validación de imágenes, servicios, controladores y módulos.
- [x] Probar autorización, baja lógica, límites, principal y fallos parciales.
- [x] Actualizar README_BACKEND, HTTP, Postman y .env.example.
- [x] Ejecutar build, lint, pruebas unitarias y e2e viables.

## Resultados

- `npm run build`, `npm run lint`, `npm test -- --runInBand`: correctos; 12 suites y 66 pruebas unitarias pasan.
- `SMARTPET_TEST_DATABASE=1 npm run test:e2e -- --runInBand`: 9 pruebas pasan con Nest, JWT y PostgreSQL real en un esquema temporal eliminado al finalizar.
- Verificado aislamiento de propietario incluso para ADMIN, usuarios inactivos, DTO y multipart, imágenes falsas, tamaño/cantidad, especie inexistente, baja lógica y conservación de fotos.
- Dos adiciones concurrentes a una mascota con cuatro fotos producen 201 y 400; quedan cinco y una sola principal.
- Verificados eliminación de principal, conservación de última foto, foto ajena a la mascota, borrado exitoso, fallo remoto con reintento, fallo de subida parcial y fallo SQL tras subir con compensación persistente.
- La nueva migración se ejecutó y revirtió en el esquema temporal; no se aplicó a las tablas habituales. La migración inicial permanece intacta.
- Cloudinary se simula en las pruebas; no se usaron credenciales reales ni se enviaron archivos a una cuenta externa.
