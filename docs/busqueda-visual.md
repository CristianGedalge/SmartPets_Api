# Búsqueda visual de avistamientos

`POST /api/v1/busqueda-visual/avistamientos`, Bearer JWT de CIUDADANO. Respuesta 201. No cambia los contratos de publicación, chat ni consulta de avistamientos existentes.

Multipart:

| Campo | Regla |
| --- | --- |
| `especieId` | Obligatorio, entero positivo de la especie Perro o Gato existente |
| `fotos` | De 1 a 5 archivos JPEG/PNG/WebP, hasta 5 MiB cada uno |

No admite propietario, rol, URLs, estado ni opciones de modelo desde el cliente.

Respuesta: `{modelo,aviso,fotosConsultadas,fotosNoProcesadas,resultados:[{similitud,avistamiento}]}`. `avistamiento` usa datos públicos de la ficha (id, especie, descripción, dirección, fecha, ubicación, estado, esPropio y fotos con id/url/esPrincipal). No devuelve propietario, contacto privado, claves Cloudinary ni vectores.

Cada candidato representa un avistamiento distinto. Orden descendente por similitud; empate por UUID. Puntaje: para cada foto de consulta se toma la mejor similitud coseno entre las fotos disponibles de ese avistamiento, y se promedian esos valores. Solo se devuelven candidatos que alcancen `IA_MIN_SIMILARITY` (0.60 por defecto); si ninguno lo alcanza, `resultados` es un arreglo vacío. Hasta cinco resultados, siempre de la especie elegida, ACTIVO y con propietario activo. Se revalida visibilidad después de la inferencia. El puntaje y el filtro no son porcentajes de certeza; un candidato todavía puede ser otra mascota.

Errores: 400 campos/especie/imagen inválidos; 401 sin sesión válida; 403 rol diferente; 413 tamaño; 422 más de 200 fotos candidatas; 429 búsqueda simultánea; 503 servicio IA o todas las fotos inaccesibles. Fotos inaccesibles parcialmente se omiten y cuentan en `fotosNoProcesadas`. Si no hay fotos candidatas se devuelve `resultados: []` después de validar/procesar la consulta.

## Persistencia y configuración

Migración `1795046400000-BusquedaVisualSchema.ts`: tabla `avistamiento_embedding`, clave compuesta `(foto_id, modelo)`, vector `real[]` de 512 componentes y fecha. `foto_id` referencia `avistamiento_foto`, con borrado en cascada. No requiere PostGIS ni pgvector para esta galería acotada. Caché creada bajo demanda para fotos nuevas y antiguas, identificada por versión/hash del modelo. Reiniciar el backend no elimina los vectores; cambiar de modelo requiere reindexarlos bajo la nueva versión.

`IA_SERVICE_URL` y `IA_SERVICE_TOKEN`: opcionales juntos; ambos vacíos deshabilitan búsqueda visual sin deshabilitar el resto de la API. Si se configuran, la URL debe ser un origen HTTP(S) y el token tener al menos 32 caracteres. `IA_MIN_SIMILARITY` acepta valores de 0 a 1 y usa 0.60 por defecto. El token coincide con el del servicio Python y nunca se envía al móvil. En local ya fueron configurados. Sin dependencias Node nuevas.

No se persisten fotos de consulta. Descargas solo de URLs Cloudinary almacenadas, con HTTPS, sin redirecciones, timeout y máximo 5 MiB. El modelo solo recibe bytes, sin credenciales Cloudinary ni datos del usuario. La carga inicial puede tardar; el móvil usa timeout de 180 segundos y conserva las fotos para reintentar. El indexado conserva sus avances.

[Comandos de ejecución y límites del modelo](../../smartpet_ia/INTEGRACION.md).

## Pruebas

`npm test -- --runInBand visual-search` y, con `$env:SMARTPET_TEST_DATABASE='1'`, `npm run test:e2e -- --runInBand busqueda-visual`. Usan esquema temporal aislado. Para la prueba ONNX real, iniciar Python y configurar además `$env:SMARTPET_TEST_IA='1'`; requiere las tres fotos de perros del dataset que ya están disponibles localmente. Esa prueba verifica integración, no precisión en producción.
