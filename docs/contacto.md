# Formulario de contacto empresarial

## Enviar mensaje

`POST /api/v1/contacto` es público y permite enviar una consulta desde el sitio empresarial sin abrir un cliente de correo.

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@example.com",
  "asunto": "Consulta general",
  "mensaje": "Quiero recibir más información sobre SmartPet.",
  "sitioWeb": ""
}
```

`sitioWeb` es un honeypot opcional y debe permanecer vacío. El nombre admite 2-100 caracteres, el correo hasta 150, el asunto 3-120 sin saltos de línea y el mensaje 10-2000. Los campos adicionales se rechazan por la validación global.

Respuestas:

- `201 { "enviado": true }`: Brevo aceptó el correo.
- `400`: datos inválidos o honeypot lleno.
- `429`: más de tres intentos desde la misma IP durante quince minutos.
- `503`: proveedor sin configurar, timeout o rechazo de Brevo.

El correo del visitante se usa como `replyTo`; el servidor envía desde el remitente verificado. El contenido se escapa antes de generar HTML y no se guarda en PostgreSQL ni se registra en logs. El límite actual vive en memoria por instancia; un despliegue con varias instancias debe usar un almacén compartido.

## Variables

```env
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=SmartPet
CONTACT_RECIPIENT_EMAIL=cristian.gedalge2018@gmail.com
```

`BREVO_SENDER_EMAIL` debe estar verificado en Brevo. La clave solo pertenece al backend. Si `CONTACT_RECIPIENT_EMAIL` falta, la configuración usa el correo confirmado del administrador como valor predeterminado.
