import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { iaConfig } from '../../config';

export const VISUAL_MODEL =
  'pet-recognition-base:8691f5f6d0cebbd1602d21def63a34f7a58f78e08b3d4914cb81adcc2efd83f8';

export function normalizeVector(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length !== 512 ||
    !value.every((v) => typeof v === 'number' && Number.isFinite(v))
  )
    throw new Error('Invalid vector');
  const vector = value as number[];
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (!Number.isFinite(norm) || norm < 1e-10) throw new Error('Invalid norm');
  return vector.map((v) => v / norm);
}

@Injectable()
export class VisualModelClient {
  constructor(
    @Inject(iaConfig.KEY) private readonly config: ConfigType<typeof iaConfig>,
  ) {}

  async embed(images: Buffer[], timeout = 45000): Promise<number[][]> {
    if (!this.config.url || !this.config.token)
      throw new ServiceUnavailableException(
        'La búsqueda visual no está configurada.',
      );
    try {
      const response = await fetch(`${this.config.url}/embeddings`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.token,
        },
        body: JSON.stringify({
          images: images.map((buffer) => buffer.toString('base64')),
        }),
        signal: AbortSignal.timeout(Math.max(1, timeout)),
      });
      if (response.status === 400)
        throw new BadRequestException(
          'No se pudieron leer las fotos. Usa imágenes válidas de una sola mascota.',
        );
      if (!response.ok) throw new Error('Inference unavailable');
      const data = (await response.json()) as {
        modelId?: string;
        embeddings?: unknown[];
      };
      if (
        data.modelId !== VISUAL_MODEL ||
        !Array.isArray(data.embeddings) ||
        data.embeddings.length !== images.length
      )
        throw new Error('Incompatible model response');
      return data.embeddings.map(normalizeVector);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException(
        'No se pudo conectar con el modelo de búsqueda visual. Intenta nuevamente.',
      );
    }
  }
}
