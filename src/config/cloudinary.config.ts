import { registerAs } from '@nestjs/config';

export const cloudinaryConfig = registerAs('cloudinary', () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName) throw new Error('Falta configurar CLOUDINARY_CLOUD_NAME');
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
    throw new Error('CLOUDINARY_CLOUD_NAME tiene un formato inválido');
  }
  if (!apiKey) throw new Error('Falta configurar CLOUDINARY_API_KEY');
  if (!apiSecret) throw new Error('Falta configurar CLOUDINARY_API_SECRET');

  return { cloudName, apiKey, apiSecret };
});
