import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { contactConfig } from '../../config/contact.config';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!,
  );

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(
    @Inject(contactConfig.KEY)
    private readonly config: ConfigType<typeof contactConfig>,
  ) {}

  sendVerification(email: string, nombre: string, codigo: string) {
    return this.send({
      email,
      nombre,
      subject: 'Tu código de verificación de SmartPet',
      text: `Hola ${nombre}. Tu código de verificación es ${codigo}. Vence en 10 minutos.`,
      html: `<p>Hola <strong>${escapeHtml(nombre)}</strong>,</p><p>Tu código de verificación de SmartPet es:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px">${codigo}</p><p>Vence en 10 minutos. Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
    });
  }

  sendWelcome(email: string, nombre: string, versionLegal: string) {
    const baseUrl = this.config.publicWebUrl.replace(/\/$/, '');
    const termsUrl = `${baseUrl}/terminos`;
    const privacyUrl = `${baseUrl}/privacidad`;
    return this.send({
      email,
      nombre,
      subject: 'Bienvenido a SmartPet',
      text: `Hola ${nombre}. Tu correo fue verificado y tu cuenta SmartPet está lista. Al registrarte aceptaste los Términos y Condiciones y la Política de Privacidad, versión ${versionLegal}. Términos: ${termsUrl}. Privacidad: ${privacyUrl}.`,
      html: `<p>Hola <strong>${escapeHtml(nombre)}</strong>,</p><h2>¡Bienvenido a SmartPet!</h2><p>Tu correo fue verificado y tu cuenta ya está lista.</p><p>Al registrarte aceptaste los Términos y Condiciones y la Política de Privacidad, versión <strong>${escapeHtml(versionLegal)}</strong>.</p><p><a href="${termsUrl}">Ver Términos y Condiciones</a><br><a href="${privacyUrl}">Ver Política de Privacidad</a></p><p>Equipo SmartPet</p>`,
    });
  }

  private async send(message: {
    email: string;
    nombre: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    if (
      !this.config.enabled ||
      !this.config.apiKey ||
      !this.config.senderEmail
    ) {
      this.logger.warn('Correo transaccional deshabilitado por configuración.');
      return false;
    }
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.config.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.config.senderName,
            email: this.config.senderEmail,
          },
          to: [{ email: message.email, name: message.nombre }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(
          `Brevo rechazó un correo transaccional (${response.status}).`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar un correo transaccional: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return false;
    }
  }
}
