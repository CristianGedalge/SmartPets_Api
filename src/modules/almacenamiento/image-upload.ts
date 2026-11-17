import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Structural type for in-memory Multer files; no additional package is required.
export interface ImageUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export const MAX_PHOTOS = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const photoUploadOptions: MulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: MAX_PHOTOS,
    fields: 10,
    fieldSize: 1024,
    parts: 15,
  },
  fileFilter: (_request, file, callback) => {
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Solo se permiten imágenes JPEG, PNG o WebP.'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

export function validatePhotos(
  files: ImageUpload[] | undefined,
): asserts files is ImageUpload[] {
  if (!files?.length || files.length > MAX_PHOTOS) {
    throw new BadRequestException(
      'Envía entre 1 y 5 fotografías en el campo fotos.',
    );
  }
  for (const file of files) {
    if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) {
      throw new BadRequestException('La fotografía está vacía.');
    }
    if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
      throw new PayloadTooLargeException(
        'Cada fotografía debe pesar como máximo 5 MB.',
      );
    }
    const bytes = file.buffer;
    const jpeg =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    const png =
      bytes.length >= 8 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
    const detected = jpeg
      ? 'image/jpeg'
      : png
        ? 'image/png'
        : webp
          ? 'image/webp'
          : null;
    if (!detected || detected !== file.mimetype) {
      throw new BadRequestException(
        'El contenido del archivo no corresponde a una imagen JPEG, PNG o WebP válida.',
      );
    }
  }
}
