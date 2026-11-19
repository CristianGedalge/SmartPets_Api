import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  VisualModelClient,
  normalizeVector,
  VISUAL_MODEL,
} from './visual-model.client';
import { SightingPhotoClient } from './sighting-photo.client';
import { similarityScore } from './ranking';

describe('Visual model boundary', () => {
  const originalFetch = global.fetch;
  const vector = (index: number) =>
    Array.from({ length: 512 }, (_, i) => (i === index ? 1 : 0));
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('compara varias consultas con la mejor foto del mismo reporte', () => {
    expect(similarityScore([vector(0), vector(1)], [vector(0)])).toBe(0.5);
    expect(
      similarityScore([vector(0), vector(1)], [vector(0), vector(1)]),
    ).toBe(1);
  });
  it('rechaza vectores nulos, incorrectos o no finitos', () => {
    for (const value of [
      [],
      Array(512).fill(0),
      [...vector(0).slice(0, 511), NaN],
      Array(512).fill('1'),
    ])
      expect(() => normalizeVector(value)).toThrow();
  });
  it('valida modelo y dimensiones; usa credenciales internas sin enviarlas al móvil', async () => {
    const mock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ modelId: VISUAL_MODEL, embeddings: [vector(0)] }),
        ),
      );
    global.fetch = mock;
    const client = new VisualModelClient({
      url: 'http://127.0.0.1:8001',
      token: 'private-token',
    });
    expect(await client.embed([Buffer.from('photo')])).toEqual([vector(0)]);
    expect(mock.mock.calls[0][0]).toBe('http://127.0.0.1:8001/embeddings');
    mock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ modelId: 'wrong', embeddings: [vector(0)] }),
      ),
    );
    await expect(client.embed([Buffer.from('photo')])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    mock.mockResolvedValueOnce(new Response('{}', { status: 400 }));
    await expect(client.embed([Buffer.from('photo')])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('servicio deshabilitado o desconectado produce 503', async () => {
    await expect(
      new VisualModelClient({ url: undefined, token: undefined }).embed([]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    global.fetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockRejectedValue(new Error('connection refused'));
    await expect(
      new VisualModelClient({
        url: 'http://localhost:8001',
        token: 'private',
      }).embed([Buffer.from('photo')]),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('no descarga destinos privados ni redirecciones fuera de Cloudinary', async () => {
    const mock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(Buffer.from('photo')));
    global.fetch = mock;
    const client = new SightingPhotoClient();
    for (const url of [
      'http://127.0.0.1/photo',
      'https://res.cloudinary.com.evil.test/photo',
      'https://user:pass@res.cloudinary.com/photo',
      'https://res.cloudinary.com:444/photo',
    ])
      await expect(client.download(url)).rejects.toThrow();
    expect(mock).not.toHaveBeenCalled();
    await expect(
      client.download('https://res.cloudinary.com/test/image/upload/photo.png'),
    ).resolves.toEqual(Buffer.from('photo'));
    expect((mock.mock.calls[0][1] as RequestInit).redirect).toBe('error');
  });
  it('limita descargas aunque falte content-length', async () => {
    global.fetch = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue(new Response(Buffer.alloc(5 * 1024 * 1024 + 1)));
    await expect(
      new SightingPhotoClient().download(
        'https://res.cloudinary.com/test/photo.png',
      ),
    ).rejects.toThrow('Photo too large');
  });
});
