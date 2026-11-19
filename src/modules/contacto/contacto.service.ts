import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { contactConfig } from '../../config/contact.config';
import { EnviarContactoDto } from './dto/enviar-contacto.dto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

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
export class ContactoService {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    @Inject(contactConfig.KEY)
    private readonly config: ConfigType<typeof contactConfig>,
  ) {}

  async enviar(dto: EnviarContactoDto, ip: string) {
    this.assertRateLimit(ip || 'desconocida');
    if (
      !this.config.enabled ||
      !this.config.apiKey ||
      !this.config.senderEmail
    ) {
      throw new ServiceUnavailableException(
        'El formulario de contacto no está disponible en este momento.',
      );
    }

    const response = await this.requestBrevo(dto);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No se pudo enviar el mensaje. Inténtalo nuevamente más tarde.',
      );
    }
    return { enviado: true };
  }

  private async requestBrevo(dto: EnviarContactoDto) {
    try {
      return await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.config.apiKey!,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.config.senderName,
            email: this.config.senderEmail,
          },
          to: [{ email: this.config.recipientEmail }],
          replyTo: { email: dto.email, name: dto.nombre },
          subject: `[SmartPet] ${dto.asunto}`,
          textContent: `Nombre: ${dto.nombre}\nCorreo: ${dto.email}\n\n${dto.mensaje}`,
          htmlContent: `<h2>Nueva consulta desde SmartPet</h2><p><strong>Nombre:</strong> ${escapeHtml(dto.nombre)}</p><p><strong>Correo:</strong> ${escapeHtml(dto.email)}</p><p><strong>Asunto:</strong> ${escapeHtml(dto.asunto)}</p><p>${escapeHtml(dto.mensaje).replaceAll('\n', '<br>')}</p>`,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo enviar el mensaje. Inténtalo nuevamente más tarde.',
      );
    }
  }

  private assertRateLimit(ip: string) {
    const now = Date.now();
    const current = (this.attempts.get(ip) ?? []).filter(
      (timestamp) => now - timestamp < WINDOW_MS,
    );
    if (current.length >= MAX_REQUESTS) {
      throw new HttpException(
        'Has enviado varios mensajes. Inténtalo nuevamente más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.push(now);
    this.attempts.set(ip, current);
  }
}
