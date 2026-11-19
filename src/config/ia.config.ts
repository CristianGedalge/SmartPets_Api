import { registerAs } from '@nestjs/config';

export const iaConfig = registerAs('ia', () => {
  const url = process.env.IA_SERVICE_URL?.trim();
  const token = process.env.IA_SERVICE_TOKEN?.trim();
  const rawMinSimilarity = process.env.IA_MIN_SIMILARITY?.trim();
  const minSimilarity = rawMinSimilarity ? Number(rawMinSimilarity) : 0.6;
  if (!Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1)
    throw new Error('IA_MIN_SIMILARITY debe ser un número entre 0 y 1.');
  if (!url && !token)
    return { url: undefined, token: undefined, minSimilarity };
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
  return { url: parsed.origin, token, minSimilarity };
});
