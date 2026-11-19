# Diseño

## Endpoint

`POST /api/v1/agente/chat`

Body:

```json
{
  "mensajes": [
    { "rol": "USUARIO", "contenido": "¿Cómo publico una alerta?" },
    { "rol": "ASISTENTE", "contenido": "Abre la sección Alertas..." },
    { "rol": "USUARIO", "contenido": "¿Qué datos necesito?" }
  ]
}
```

Respuesta `201`:

```json
{ "respuesta": "Necesitas..." }
```

## Integración

`BedrockConfig` valida región, token y modelo. `AgenteService` transforma los roles al formato Converse, añade un prompt de sistema, usa un timeout de 30 segundos y extrae el texto de `output.message.content`. No se agregan tablas ni migraciones.

El prompt del sitio empresarial funciona como base de conocimiento estable. Describe la propuesta de SmartPet, las funciones disponibles por tipo de usuario, los canales correctos, el alcance de las suscripciones, el proceso de adopción, los datos de contacto y las reglas de seguridad. El modelo debe reconocer sus límites, orientar al canal correspondiente y evitar inventar información en tiempo real.

El límite en memoria permite 10 consultas por usuario cada cinco minutos. En despliegues con varias instancias deberá reemplazarse por un contador compartido.
