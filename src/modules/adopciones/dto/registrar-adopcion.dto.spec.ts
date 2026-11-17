import { ValidationPipe } from '@nestjs/common';
import { RegistrarAdopcionDto } from './registrar-adopcion.dto';

describe('RegistrarAdopcionDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const valid = {
    nombreAdoptante: ' Ana Perez ',
    telefonoAdoptante: ' 70000000 ',
    fechaAdopcion: '2026-11-17',
  };
  const transform = (data: unknown) =>
    pipe.transform(data, { type: 'body', metatype: RegistrarAdopcionDto });
  it('acepta una persona sin cuenta y normaliza espacios', async () => {
    await expect(transform(valid)).resolves.toMatchObject({
      nombreAdoptante: 'Ana Perez',
      telefonoAdoptante: '70000000',
    });
  });
  it.each([
    {},
    { ...valid, nombreAdoptante: ' ' },
    { ...valid, nombreAdoptante: 'a'.repeat(151) },
    { ...valid, telefonoAdoptante: null },
    { ...valid, telefonoAdoptante: 'x'.repeat(21) },
    { ...valid, fechaAdopcion: '2026-02-30' },
    { ...valid, fechaAdopcion: '2026-11-17T00:00:00Z' },
    { ...valid, observaciones: 'x'.repeat(2001) },
    { ...valid, encargadoId: 'inyectado' },
    { ...valid, animalResguardadoId: 'inyectado' },
    { ...valid, estado: 'ADOPTADA' },
  ])('rechaza datos inválidos o campos del servidor %#', async (data) => {
    await expect(transform(data)).rejects.toThrow();
  });
});
