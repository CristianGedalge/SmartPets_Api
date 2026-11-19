import { registerAs } from '@nestjs/config';

export const iaConfig = registerAs('ia', () => {
  const url = process.env.IA_SERVICE_URL?.trim();
  const token = process.env.IA_SERVICE_TOKEN?.trim();
  if (!url && !token) return { url: undefined, token: undefined };
  if (!url || !token || token.length < 32)
    throw new Error(
      'Configura IA_SERVICE_URL e IA_SERVICE_TOKEN (mínimo 32 caracteres).',
    );
  const parsed = new URL(url);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    throw new Error(
      'IA_SERVICE_URL debe ser el origen HTTP del servicio interno.',
    );
  }
  return { url: parsed.origin, token };
});
