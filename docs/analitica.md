# Analítica: mapa de calor

`GET /api/v1/analitica/mapa-calor`, con `Authorization: Bearer <access_token>`. Exclusivo de ADMIN y ENCARGADO activos. Ambos consultan agregados de la comunidad; no requiere establecimiento activo. CIUDADANO recibe 403 y una petición sin JWT recibe 401.

No crea tablas, migraciones, variables de entorno ni dependencias. Consulta `alerta_extravio` y `avistamiento` existentes.

## Filtros

| Parámetro | Valores y comportamiento |
| --- | --- |
| `tipo` | `ALERTAS` (predeterminado) o `AVISTAMIENTOS` |
| `estado` para alertas | `ACTIVA` (predeterminado), `RESUELTA`, `CANCELADA`, `TODOS` |
| `estado` para avistamientos | `ACTIVO` (predeterminado), `CERRADO`, `CANCELADO`, `TODOS` |
| `desde`, `hasta` | Opcionales, fechas calendario `AAAA-MM-DD`, años 1000–9999. Ambos extremos inclusivos en Bolivia (UTC-04:00) |

Ejemplo: `/analitica/mapa-calor?tipo=AVISTAMIENTOS&estado=ACTIVO&desde=2026-11-01&hasta=2026-11-18`.

Se usa la fecha del extravío/avistamiento, independiente de la fecha de creación del registro. Un estado incompatible con el tipo, una fecha imposible, un intervalo invertido o un campo adicional produce 400. Más de 5000 zonas produce 422 y solicita reducir el intervalo; no se truncan resultados.

## Respuesta

```json
{
  "tipo": "AVISTAMIENTOS",
  "estado": "ACTIVO",
  "desde": null,
  "hasta": null,
  "totalReportes": 3,
  "datos": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [-63.182, -17.783] },
        "properties": { "cantidad": 3 }
      }
    ]
  }
}
```

GeoJSON usa orden longitud/latitud. Se agrupan puntos redondeando ambas coordenadas a tres decimales. No devuelve reportes individuales, IDs, propietarios, direcciones, descripciones, contactos, fotos ni claves de almacenamiento. Sin resultados devuelve `totalReportes: 0` y `features: []`.

Siempre se excluyen alertas OCULTA, reportes de usuarios desactivados y alertas de mascotas desactivadas. También puntos nulos o fuera del rango del mapa: latitud ±85.05112878 y longitud ±180. `TODOS` no elimina estas exclusiones.

Cada reporte aporta una unidad; no se cuentan mascotas únicas ni se calculan niveles de riesgo. La intensidad visual es relativa a la consulta y al zoom. Los puntos son aproximados, no ubicaciones exactas.

## Verificación

Pruebas unitarias: `npm test -- --runInBand analitica`. Integración HTTP con PostgreSQL: en PowerShell, `$env:SMARTPET_TEST_DATABASE='1'` y `npm run test:e2e -- --runInBand analitica`. La integración utiliza un esquema temporal aislado y lo elimina al finalizar; no modifica las tablas de la aplicación.
