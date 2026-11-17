import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { cloudinaryConfig } from '../../config/cloudinary.config';
import type { ImageUpload } from './image-upload';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(cloudinaryConfig.KEY)
    private readonly config: ConfigType<typeof cloudinaryConfig>,
  ) {}

  private async send(
    action: 'upload' | 'destroy',
    params: Record<string, string>,
    file?: ImageUpload,
  ): Promise<Record<string, unknown>> {
    const { cloudName, apiKey, apiSecret } = this.config;
    const signed = {
      ...params,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const payload = Object.keys(signed)
      .sort()
      .map((key) => `${key}=${signed[key]}`)
      .join('&');
    const signature = createHash('sha256')
      .update(payload + apiSecret)
      .digest('hex');
    const form = new FormData();
    Object.entries(signed).forEach(([key, value]) => form.append(key, value));
    form.append('api_key', apiKey);
    form.append('signature', signature);
    if (file)
      form.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        'foto',
      );
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok) throw new Error('Cloudinary request failed');
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || Array.isArray(result))
        throw new Error('Invalid Cloudinary response');
      return result as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(
        'No pudimos completar la operación con el almacenamiento de imágenes. Inténtalo nuevamente.',
      );
    }
  }

  async upload(
    file: ImageUpload,
    storageKey: string,
  ): Promise<{ url: string; storageKey: string }> {
    const response = await this.send(
      'upload',
      {
        public_id: storageKey,
        overwrite: 'false',
        allowed_formats: 'jpg,jpeg,png,webp',
      },
      file,
    );
    if (
      response.public_id !== storageKey ||
      typeof response.secure_url !== 'string' ||
      !response.secure_url.startsWith('https://') ||
      response.resource_type !== 'image' ||
      !['jpg', 'jpeg', 'png', 'webp'].includes(String(response.format))
    ) {
      throw new ServiceUnavailableException(
        'El almacenamiento devolvió una imagen no válida.',
      );
    }
    return { url: response.secure_url, storageKey };
  }

  async destroy(storageKey: string): Promise<void> {
    const response = await this.send('destroy', {
      public_id: storageKey,
      invalidate: 'true',
    });
    if (response.result !== 'ok' && response.result !== 'not found') {
      throw new ServiceUnavailableException(
        'No pudimos eliminar el archivo del almacenamiento.',
      );
    }
  }
}
