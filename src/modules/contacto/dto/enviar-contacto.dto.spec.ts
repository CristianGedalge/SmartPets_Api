import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EnviarContactoDto } from './enviar-contacto.dto';

const valid = {
  nombre: 'Ana Pérez',
  email: 'ANA@EXAMPLE.COM ',
  asunto: ' Consulta general ',
  mensaje: ' Quiero conocer más información sobre SmartPet. ',
};

describe('EnviarContactoDto', () => {
  it('acepta, normaliza y limita una consulta válida', async () => {
    const dto = plainToInstance(EnviarContactoDto, valid);
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('ana@example.com');
    expect(dto.asunto).toBe('Consulta general');
  });

  it('rechaza mensajes cortos, asunto con salto y honeypot lleno', async () => {
    const dto = plainToInstance(EnviarContactoDto, {
      ...valid,
      asunto: 'Asunto\r\nBcc: victim@example.com',
      mensaje: 'corto',
      sitioWeb: 'https://spam.example',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['asunto', 'mensaje', 'sitioWeb']),
    );
  });
});
