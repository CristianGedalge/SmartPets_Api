# Analítica: mapa de calor

ADMIN y ENCARGADO con cuenta activa consultan concentración global de alertas de extravío o avistamientos. CIUDADANO y visitantes no tienen acceso. No requiere establecimiento activo para consultar agregados comunitarios. No crear tablas, entidades, migraciones, PostGIS ni dependencias.

Selector de tipo, estado y fechas opcionales. Alertas: ACTIVA (predeterminado), RESUELTA, CANCELADA, TODOS; OCULTA nunca se incluye. Avistamientos: ACTIVO (predeterminado), CERRADO, CANCELADO, TODOS. Excluir reportes de usuarios desactivados y alertas de mascotas desactivadas. Filtrar por fecha de extravío/avistamiento, no por creación. Fechas calendario inclusivas en horario de Bolivia (UTC-04:00); rechazar intervalo invertido y estado incompatible.

Solo retornar puntos agregados por redondeo de latitud/longitud a 3 decimales y cantidad de reportes; sin UUID de reporte, propietario, descripción, fotos ni contactos. Excluir coordenadas fuera de Web Mercator (latitud ±85.05112878, longitud ±180) o nulas. Cada reporte cuenta por igual; no inferir animales únicos ni zonas de riesgo. Límite de 5000 celdas: rechazar consulta demasiado amplia en lugar de truncar datos silenciosamente.

Aceptación: ambos roles permitidos, ciudadano/visitante denegados; estados/fechas válidos; sumas exactas en agregados; reportes ocultos/desactivados excluidos; sin datos personales; GeoJSON vacío válido; no cambios en APIs existentes ni móvil.
