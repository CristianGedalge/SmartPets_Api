# Diseño de API

AnaliticaModule importa AuthModule y repositorios AlertaExtravio/Avistamiento. Controller GET /api/v1/analitica/mapa-calor con AuthRole(ADMIN,ENCARGADO). DTO tipo ALERTAS|AVISTAMIENTOS por defecto ALERTAS; estado opcional limitado a la lista conocida; desde/hasta opcionales YYYY-MM-DD válidos (años 1000-9999).

Service valida combinación tipo/estado e intervalo; SQL agrupado ROUND(latitud,3), ROUND(longitud,3), COUNT(*) con predicados de actividad y fechas. Desde inclusivo a las 00:00 -04:00, hasta exclusivo a las 00:00 -04:00 del día siguiente. Consultar máximo 5001 grupos; 422 si supera 5000. No descargar entidades o fotos para agrupar en memoria.

Respuesta: {tipo,estado,desde:string|null,hasta:string|null,totalReportes:number,datos:{type:FeatureCollection,features:[{type:Feature,geometry:{type:Point,coordinates:[longitud,latitud]},properties:{cantidad:number}}]}}. Orden estable por celda. Sin paginación porque se requiere el mapa completo dentro del límite explícito. 400 filtro/fecha/estado, 401 sin sesión, 403 rol, 422 demasiadas zonas.
