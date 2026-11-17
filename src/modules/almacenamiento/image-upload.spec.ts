import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MAX_IMAGE_BYTES, validatePhotos } from './image-upload';

describe('Validación de fotografías', () => {
  const jpeg = {
    buffer: Buffer.from([255, 216, 255]),
    mimetype: 'image/jpeg',
    size: 3,
  };
  it('requiere de una a cinco imágenes', () => {
    expect(() => validatePhotos(undefined)).toThrow(BadRequestException);
    expect(() => validatePhotos([])).toThrow(BadRequestException);
    expect(() => validatePhotos(Array.from({ length: 6 }, () => jpeg))).toThrow(
      BadRequestException,
    );
    expect(() => validatePhotos([jpeg])).not.toThrow();
  });
  it('rechaza MIME falso, archivos vacíos, SVG y bytes que no son imágenes', () => {
    expect(() => validatePhotos([{ ...jpeg, mimetype: 'image/png' }])).toThrow(
      BadRequestException,
    );
    expect(() =>
      validatePhotos([{ ...jpeg, buffer: Buffer.alloc(0) }]),
    ).toThrow(BadRequestException);
    expect(() =>
      validatePhotos([
        {
          ...jpeg,
          buffer: Buffer.from('<svg></svg>'),
          mimetype: 'image/svg+xml',
        },
      ]),
    ).toThrow(BadRequestException);
    expect(() =>
      validatePhotos([{ ...jpeg, buffer: Buffer.from('not an image') }]),
    ).toThrow(BadRequestException);
  });
  it('limita el tamaño real además del declarado', () => {
    expect(() =>
      validatePhotos([{ ...jpeg, size: MAX_IMAGE_BYTES + 1 }]),
    ).toThrow(PayloadTooLargeException);
    expect(() =>
      validatePhotos([
        { ...jpeg, buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1), size: 3 },
      ]),
    ).toThrow(PayloadTooLargeException);
  });
  it('reconoce PNG y WebP por su contenido', () => {
    expect(() =>
      validatePhotos([
        {
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
          mimetype: 'image/png',
          size: 8,
        },
      ]),
    ).not.toThrow();
    expect(() =>
      validatePhotos([
        {
          buffer: Buffer.from('RIFF1234WEBP'),
          mimetype: 'image/webp',
          size: 12,
        },
      ]),
    ).not.toThrow();
  });
});
