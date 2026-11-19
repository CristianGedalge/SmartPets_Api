# Formulario de contacto empresarial

El sitio empresarial permite que cualquier visitante envíe una consulta al administrador sin abrir una aplicación de correo. El backend recibe nombre, correo de respuesta, asunto y mensaje, valida límites estrictos y envía mediante la API HTTP de Brevo a `cristian.gedalge2018@gmail.com`. La ruta es pública y no modifica ninguna tabla.

Reglas: no revelar credenciales ni el destinatario en respuestas; usar el correo del visitante solo como `replyTo`; escapar contenido al construir HTML; rechazar campos adicionales y el honeypot; máximo tres intentos por IP en quince minutos por instancia; timeout de red; respuesta genérica si el proveedor falla. Si Brevo no está configurado, responder servicio no disponible. No guardar mensajes en la base de datos ni escribir su contenido en logs.

Criterios: envío válido devuelve `201 { enviado: true }`; DTO inválido devuelve `400`; límite devuelve `429`; proveedor no configurado o no disponible devuelve `503`. Login y otros contratos no cambian.
