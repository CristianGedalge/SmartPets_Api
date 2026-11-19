# Agente conversacional SmartPet

## Objetivo

Permitir que un ciudadano autenticado consulte un asistente de SmartPet desde la aplicación móvil sin exponer credenciales de Amazon Bedrock en el dispositivo.

## Requisitos

- El acceso requiere JWT con rol `CIUDADANO`.
- El cliente envía hasta 12 mensajes de texto alternados entre usuario y asistente.
- El último mensaje siempre pertenece al usuario.
- El backend añade instrucciones propias de SmartPet y llama a Bedrock Runtime `Converse`.
- La clave Bearer solo se lee desde el entorno del backend.
- La conversación no se persiste en la base de datos.
- Se limita el número de consultas por usuario para controlar abuso y costo.
- Los errores del proveedor no revelan credenciales ni respuestas internas.

## Criterios de aceptación

1. Un ciudadano recibe una respuesta de texto del agente.
2. ADMIN y ENCARGADO reciben 403.
3. Una conversación inválida recibe 400.
4. Si Bedrock no está configurado o falla, la API responde 503.
5. La credencial nunca forma parte de la respuesta ni del contrato móvil.
