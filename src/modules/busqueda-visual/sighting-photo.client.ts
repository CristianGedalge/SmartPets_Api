import { Injectable } from '@nestjs/common';
import { MAX_IMAGE_BYTES } from '../almacenamiento/image-upload';

@Injectable()
export class SightingPhotoClient {
  async download(address: string, timeout = 10000): Promise<Buffer> {
    const url = new URL(address);
    // URLs come from stored photos, never from user search fields. Reject redirects/SSRF.
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      url.port ||
      url.username ||
      url.password
    )
      throw new Error('Unsupported photo host');
    const response = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(Math.max(1, timeout)),
    });
    if (
      !response.ok ||
      !response.body ||
      Number(response.headers.get('content-length')) > MAX_IMAGE_BYTES
    ) {
      await response.body?.cancel();
      throw new Error('Photo unavailable');
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_BYTES) throw new Error('Photo too large');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    if (!size) throw new Error('Empty photo');
    return Buffer.concat(chunks);
  }
}
