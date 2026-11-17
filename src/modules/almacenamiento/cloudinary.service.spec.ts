import { ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  const file = {
    buffer: Buffer.from([255, 216, 255]),
    mimetype: 'image/jpeg',
    size: 3,
  };
  const config = {
    cloudName: 'test-cloud',
    apiKey: 'test-key',
    apiSecret: 'test-secret',
  };
  const service = new CloudinaryService(config);
  afterEach(() => jest.restoreAllMocks());

  it('firma todos los parámetros y usa HTTPS, timeout y public_id propio', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: 'pet/key',
          secure_url: 'https://images.test/f.jpg',
          resource_type: 'image',
          format: 'jpg',
        }),
      ),
    );
    await expect(service.upload(file, 'pet/key')).resolves.toEqual({
      storageKey: 'pet/key',
      url: 'https://images.test/f.jpg',
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    const form = options!.body as FormData;
    const timestamp = form.get('timestamp');
    if (typeof timestamp !== 'string') throw new Error('Missing timestamp');
    const payload = `allowed_formats=jpg,jpeg,png,webp&overwrite=false&public_id=pet/key&timestamp=${timestamp}`;
    expect(form.get('signature')).toBe(
      createHash('sha256')
        .update(payload + 'test-secret')
        .digest('hex'),
    );
    expect(form.get('api_key')).toBe('test-key');
    expect(form.has('api_secret')).toBe(false);
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(['ok', 'not found'])(
    'destroy es idempotente para %s',
    async (result) => {
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify({ result })));
      await expect(service.destroy('pet/key')).resolves.toBeUndefined();
    },
  );

  it('oculta errores externos y rechaza respuestas de otro recurso', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('secret', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            public_id: 'other',
            secure_url: 'https://test/file.jpg',
          }),
        ),
      );
    await expect(service.upload(file, 'pet/key')).rejects.toThrow(
      ServiceUnavailableException,
    );
    await expect(service.upload(file, 'pet/key')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
