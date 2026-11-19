import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../dto/register.dto';
import { LEGAL_VERSION } from './legal-version';

describe('Aceptación explícita de documentos vigentes', () => {
  const base = {
    nombre: 'Ana',
    apellido: 'Perez',
    email: 'ana@example.com',
    password: 'password123',
    aceptaTerminos: true,
    aceptaPrivacidad: true,
    versionLegal: LEGAL_VERSION,
  };
  it.each([
    { aceptaTerminos: undefined },
    { aceptaPrivacidad: false },
    { aceptaTerminos: 'true' },
    { aceptaPrivacidad: 1 },
    { versionLegal: 'anterior' },
    { versionLegal: undefined },
  ])(
    'rechaza aceptación ausente, implícita o desactualizada: %j',
    async (input) => {
      expect(
        (await validate(plainToInstance(RegisterDto, { ...base, ...input })))
          .length,
      ).toBeGreaterThan(0);
    },
  );
  it('acepta únicamente ambos valores true y versión actual', async () => {
    expect(await validate(plainToInstance(RegisterDto, base))).toHaveLength(0);
  });
});
