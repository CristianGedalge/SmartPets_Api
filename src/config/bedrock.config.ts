import { registerAs } from '@nestjs/config';

const regionPattern = /^[a-z]{2}(?:-gov)?-[a-z]+-\d$/;

export const bedrockConfig = registerAs('bedrock', () => {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK?.trim();
  const region = process.env.AWS_REGION?.trim() || 'us-east-1';
  const modelId =
    process.env.BEDROCK_MODEL_ID?.trim() || 'us.amazon.nova-lite-v1:0';

  if (!regionPattern.test(region)) {
    throw new Error('AWS_REGION tiene un formato inválido.');
  }
  if (!modelId || modelId.length > 256) {
    throw new Error('BEDROCK_MODEL_ID tiene un formato inválido.');
  }
  if (token !== undefined && token.length < 32) {
    throw new Error(
      'AWS_BEARER_TOKEN_BEDROCK debe tener al menos 32 caracteres.',
    );
  }

  return { enabled: Boolean(token), token, region, modelId };
});
