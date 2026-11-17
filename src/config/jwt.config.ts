import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;

  if (!secret?.trim()) {
    throw new Error('Falta configurar JWT_SECRET');
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  };
});
