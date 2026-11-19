import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { bedrockConfig } from '../../config/bedrock.config';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { ChatAgenteDto, RolMensajeAgente } from './dto/chat-agente.dto';

type BedrockResponse = {
  output?: { message?: { content?: Array<{ text?: unknown }> } };
};

const systemPrompt = `Eres el Agente SmartPet para ciudadanos de Bolivia. Responde siempre en español, con claridad y brevedad. Puedes orientar sobre el uso de SmartPet: mascotas, alertas de extravío, avistamientos, búsqueda visual, adopciones y chat entre usuarios. No afirmes que consultaste la base de datos ni que realizaste acciones. No inventes estados, coincidencias o datos personales. No diagnostiques: ante una urgencia de salud recomienda contactar a un veterinario. Si no conoces algo, dilo y sugiere contactar al equipo SmartPet.`;

const sitioPrompt = `Eres el asistente del sitio web de SmartPet. Responde siempre en español, con claridad y brevedad. SmartPet conecta ciudadanos, veterinarias y refugios para cuidar perros y gatos. En la web se puede conocer el proyecto, ver adopciones sin cuenta y escribir al equipo desde el formulario del inicio o la página Sobre nosotros. La adopción se coordina con la veterinaria o el refugio de cada publicación. La app móvil es para ciudadanos: ficha de la mascota, alertas de extravío, avistamientos, búsqueda por foto y chat sobre un reporte. La búsqueda por foto muestra posibles coincidencias y no confirma que sea la misma mascota. El portal web es para encargados de veterinarias y refugios, que registran su establecimiento, y para la administración. Los planes se eligen y se pagan dentro de la app; no inventes precios. No afirmes que consultaste la base de datos ni que realizaste acciones. No inventes animales, establecimientos, teléfonos ni estados. No pidas contraseñas, documentos ni datos de tarjeta. No diagnostiques: ante una urgencia de salud recomienda contactar a un veterinario. Si no conoces algo, dilo y sugiere el formulario de contacto.`;

const MENSAJE_AGENTE = 'El agente SmartPet no está disponible en este momento.';
const MENSAJE_SITIO =
  'El asistente de SmartPet no está disponible en este momento.';
const VENTANA_SITIO_MS = 10 * 60 * 1000;
const MAX_MENSAJES_SITIO = 8;

@Injectable()
export class AgenteService {
  private readonly attempts = new Map<string, number[]>();
  private readonly visitas = new Map<string, number[]>();

  constructor(
    @Inject(bedrockConfig.KEY)
    private readonly config: ConfigType<typeof bedrockConfig>,
    private readonly suscripciones: SuscripcionesService,
  ) {}

  async responder(usuarioId: string, dto: ChatAgenteDto) {
    this.validarConversacion(dto);
    await this.suscripciones.verificar(usuarioId, 'agente');
    if (!this.config.enabled || !this.config.token) {
      throw new ServiceUnavailableException(MENSAJE_AGENTE);
    }
    this.aplicarLimite(usuarioId);
    const respuesta = await this.converse(dto, systemPrompt, MENSAJE_AGENTE);
    await this.suscripciones.consumir(usuarioId, 'agente');
    return { respuesta };
  }

  async responderSitio(ip: string, dto: ChatAgenteDto) {
    this.validarConversacion(dto);
    if (!this.config.enabled || !this.config.token) {
      throw new ServiceUnavailableException(MENSAJE_SITIO);
    }
    this.aplicarLimiteSitio(ip || 'desconocida');
    const respuesta = await this.converse(dto, sitioPrompt, MENSAJE_SITIO);
    return { respuesta };
  }

  private async converse(
    dto: ChatAgenteDto,
    prompt: string,
    unavailable: string,
  ) {
    const endpoint = `https://bedrock-runtime.${this.config.region}.amazonaws.com/model/${encodeURIComponent(this.config.modelId)}/converse`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: [{ text: prompt }],
          messages: dto.mensajes.map((message) => ({
            role:
              message.rol === RolMensajeAgente.USUARIO ? 'user' : 'assistant',
            content: [{ text: message.contenido.trim() }],
          })),
          inferenceConfig: { maxTokens: 500, temperature: 0.3, topP: 0.9 },
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`Bedrock ${response.status}`);
      const data = (await response.json()) as BedrockResponse;
      const answer = data.output?.message?.content
        ?.map((block) => (typeof block.text === 'string' ? block.text : ''))
        .join('')
        .trim();
      if (!answer) throw new Error('Bedrock returned no text');
      return answer;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(unavailable);
    }
  }

  private validarConversacion(dto: ChatAgenteDto) {
    for (let index = 0; index < dto.mensajes.length; index += 1) {
      const expected =
        index % 2 === 0 ? RolMensajeAgente.USUARIO : RolMensajeAgente.ASISTENTE;
      if (dto.mensajes[index].rol !== expected) {
        throw new BadRequestException(
          'La conversación debe alternar mensajes de usuario y asistente.',
        );
      }
    }
    if (
      dto.mensajes[dto.mensajes.length - 1].rol !== RolMensajeAgente.USUARIO
    ) {
      throw new BadRequestException(
        'El último mensaje debe pertenecer al usuario.',
      );
    }
  }

  private aplicarLimite(usuarioId: string) {
    const now = Date.now();
    const recent = (this.attempts.get(usuarioId) ?? []).filter(
      (timestamp) => now - timestamp < 5 * 60 * 1000,
    );
    if (recent.length >= 10) {
      throw new HttpException(
        'Alcanzaste el límite temporal del agente. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.attempts.set(usuarioId, recent);
  }

  private aplicarLimiteSitio(ip: string) {
    const now = Date.now();
    const recent = (this.visitas.get(ip) ?? []).filter(
      (timestamp) => now - timestamp < VENTANA_SITIO_MS,
    );
    if (recent.length >= MAX_MENSAJES_SITIO) {
      throw new HttpException(
        'Alcanzaste el límite del asistente. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.visitas.set(ip, recent);
  }
}
