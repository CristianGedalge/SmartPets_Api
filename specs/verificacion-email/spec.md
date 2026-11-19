# Spec: verificacion de correo

## Objetivo

Confirmar que el correo de cada ciudadano nuevo puede recibir mensajes antes de crear su sesion movil. Despues de verificarlo, SmartPet envia una bienvenida que confirma la aceptacion legal e incluye enlaces a Terminos y Privacidad.

## Reglas

- Solo el registro de `CIUDADANO` queda pendiente de verificacion. El flujo web de `ENCARGADO` conserva la sesion inmediata.
- El codigo tiene seis digitos, dura 10 minutos y nunca se almacena en texto plano.
- Se permiten cinco intentos por codigo. Solicitar otro codigo invalida el anterior y tiene una espera de 60 segundos.
- Un ciudadano no verificado no recibe JWT al registrarse ni al iniciar sesion.
- Las cuentas existentes quedan verificadas al aplicar la migracion.
- La verificacion exitosa inicia sesion y envia una bienvenida. Un fallo posterior del correo de bienvenida no invalida la cuenta.
- La bienvenida incluye la version legal aceptada y enlaces al sitio empresarial para Terminos y Privacidad.

## Criterios de aceptacion

- Registrar un ciudadano crea la cuenta, la suscripcion gratuita y responde `requiereVerificacion: true`, sin `access_token`.
- Registrar un encargado conserva la respuesta con `access_token`.
- Verificar un codigo vigente y correcto marca el correo como verificado, elimina el codigo y devuelve la sesion.
- Un codigo incorrecto, vencido o agotado no crea una sesion y devuelve un mensaje comprensible.
- El reenvio genera un codigo nuevo y respeta la espera.
- Iniciar sesion con un ciudadano pendiente vuelve a mostrar el flujo de verificacion.
