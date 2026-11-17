import { ValidationPipe } from '@nestjs/common';
import { CreateMascotaDto } from './create-mascota.dto';
import { UpdateMascotaDto } from './update-mascota.dto';

describe('Mascota DTO', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const create = (value: object) =>
    pipe.transform(value, { type: 'body', metatype: CreateMascotaDto });
  const update = (value: object) =>
    pipe.transform(value, { type: 'body', metatype: UpdateMascotaDto });
  it('convierte form-data sin perder edad cero y recorta texto', async () => {
    await expect(
      create({
        nombre: ' Luna ',
        especieId: '1',
        pesoKg: '3.25',
        edadAproximadaMeses: '0',
      }),
    ).resolves.toMatchObject({
      nombre: 'Luna',
      especieId: 1,
      pesoKg: 3.25,
      edadAproximadaMeses: 0,
    });
  });
  it.each([
    { nombre: ' ' },
    { especieId: '' },
    { especieId: true },
    { especieId: null },
    { pesoKg: '' },
    { pesoKg: 0 },
    { pesoKg: -1 },
    { pesoKg: 10000 },
    { pesoKg: 1.123 },
    { edadAproximadaMeses: -1 },
    { edadAproximadaMeses: 1.5 },
    { sexo: 'OTRO' },
    { usuario_id: 'foreign-owner' },
    { usuarioId: 'foreign-owner' },
    { estado: false },
    { raza_id: 1 },
    { distintivos: 'test' },
    { fotos: [] },
  ])('rechaza datos inválidos o campos del servidor: %j', async (fields) => {
    await expect(
      create({ nombre: 'Luna', especieId: 1, ...fields }),
    ).rejects.toThrow();
  });
  it('PATCH acepta campos opcionales nulos y rechaza nulos en campos obligatorios', async () => {
    await expect(update({ color: null, pesoKg: null })).resolves.toMatchObject({
      color: null,
      pesoKg: null,
    });
    await expect(update({})).resolves.toBeInstanceOf(UpdateMascotaDto);
    await expect(update({ nombre: null })).rejects.toThrow();
    await expect(update({ especieId: null })).rejects.toThrow();
    await expect(update({ fotos: [] })).rejects.toThrow();
  });
});
