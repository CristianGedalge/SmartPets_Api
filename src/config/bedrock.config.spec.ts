import { bedrockConfig } from './bedrock.config';

describe('bedrockConfig', () => {
  const names = [
    'AWS_REGION',
    'AWS_BEARER_TOKEN_BEDROCK',
    'BEDROCK_MODEL_ID',
  ] as const;
  const original = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );

  afterEach(() => {
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  it('permite iniciar sin token y usa valores predeterminados', () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_BEARER_TOKEN_BEDROCK;
    delete process.env.BEDROCK_MODEL_ID;
    expect(bedrockConfig()).toEqual({
      enabled: false,
      token: undefined,
      region: 'us-east-1',
      modelId: 'us.amazon.nova-lite-v1:0',
    });
  });

  it('normaliza una configuración completa', () => {
    process.env.AWS_REGION = ' us-east-1 ';
    process.env.AWS_BEARER_TOKEN_BEDROCK = ` ${'a'.repeat(40)} `;
    process.env.BEDROCK_MODEL_ID = ' us.amazon.nova-lite-v1:0 ';
    expect(bedrockConfig()).toMatchObject({
      enabled: true,
      region: 'us-east-1',
      modelId: 'us.amazon.nova-lite-v1:0',
    });
  });

  it('rechaza región y token inválidos sin revelar el token', () => {
    process.env.AWS_REGION = 'invalid';
    expect(() => bedrockConfig()).toThrow('AWS_REGION');
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_BEARER_TOKEN_BEDROCK = 'short';
    expect(() => bedrockConfig()).toThrow('AWS_BEARER_TOKEN_BEDROCK');
  });
});
