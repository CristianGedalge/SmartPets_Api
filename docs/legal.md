# Aceptación de términos y privacidad

El registro público `POST /api/v1/auth/register` requiere estos campos adicionales:

```json
{
  "aceptaTerminos": true,
  "aceptaPrivacidad": true,
  "versionLegal": "2026-11-18.1"
}
```

Se envían junto con los datos habituales de la cuenta y, para encargados, el establecimiento. Los booleanos deben ser `true` reales: omitirlos, enviar `false`, cadenas o una versión diferente produce `400`. No se permite enviar la fecha de aceptación. El login y las respuestas de autenticación conservan su contrato.

## Persistencia

La migración `1795050000000-LegalAcceptanceSchema.ts` crea `aceptacion_legal`:

| Columna | Tipo | Regla |
| --- | --- | --- |
| `usuario_id` | UUID | Clave primaria y foránea a `usuario`; eliminación física en cascada |
| `version_terminos` | varchar(40) | Obligatoria |
| `version_privacidad` | varchar(40) | Obligatoria |
| `aceptado_en` | timestamptz | Fecha del servidor, valor predeterminado `now()` |

La aceptación se inserta en la misma transacción que el usuario y su establecimiento. Si falla cualquier inserción, se revierte todo el registro. No se inventan aceptaciones para cuentas existentes ni para el administrador inicial. No se exige volver a aceptar al iniciar sesión; este cambio aplica al registro de nuevas cuentas.

Ejecutar `npm run migration:run` antes de arrancar esta versión en otro entorno. La migración está incluida en el repositorio.

## Documentos y versiones

Los textos están en `smartpet_front/src/features/legal/content/legal.json`, con copia idéntica en `smartpet_movil/assets/legal/legal.json`. La versión debe coincidir con `src/modules/auth/legal/legal-version.ts` y la constante móvil. Al publicar otra versión, actualizar los textos, sus copias, las constantes y los ejemplos Postman de forma coordinada. Los clientes con una versión anterior recibirán `400` al registrarse.

La web publica `/terminos` y `/privacidad`, enlazados desde el footer y el registro. En Flutter se consultan sin conexión desde el registro, ingreso y perfil. Leerlos no marca automáticamente ninguna casilla.

## Responsable y contacto

El responsable indicado por el usuario es **Equipo SmartPet**. El contacto para consultas sobre el servicio, privacidad y solicitudes de eliminación de cuentas y datos es **cristian.gedalge2018@gmail.com**, incluido en ambos clientes. Las solicitudes de eliminación se atienden manualmente: la baja lógica actual no equivale a borrar todos los datos.

Los textos describen la implementación actual y son una base del proyecto, no una certificación de cumplimiento jurídico. Antes de una publicación pública deben revisarse según el responsable, sus prácticas reales y las obligaciones aplicables. Para distribución en Google Play, revisar además las políticas oficiales de [datos de usuario](https://support.google.com/googleplay/android-developer/answer/10144311) y [eliminación de cuentas](https://support.google.com/googleplay/android-developer/answer/13327111).

## Verificación

Pruebas DTO y HTTP cubren aceptación incompleta, valores inválidos, versión anterior, persistencia con fecha del servidor, registro ciudadano/encargado y reversión transaccional. Las pruebas de integración requieren `SMARTPET_TEST_DATABASE=1` y usan esquemas aislados en PostgreSQL.
