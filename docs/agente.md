# Agente SmartPet

`POST /api/v1/agente/chat` requiere JWT de `CIUDADANO`. Recibe de uno a doce mensajes alternados; el primero y el último deben usar `USUARIO`.

```json
{
  "mensajes": [
    { "rol": "USUARIO", "contenido": "¿Cómo reporto una mascota perdida?" }
  ]
}
```

Devuelve `{ "respuesta": "..." }`. El backend usa Amazon Bedrock Runtime Converse con `AWS_REGION`, `AWS_BEARER_TOKEN_BEDROCK` y `BEDROCK_MODEL_ID`. Si la clave falta, responde 503 sin impedir el arranque del resto de la API. No persiste conversaciones.
