import { ValidationPipe } from '@nestjs/common';
import { CreateAvistamientoDto } from './create-avistamiento.dto';
import { UpdateAvistamientoDto } from './update-avistamiento.dto';
import { AvistamientoActionDto } from './avistamiento-action.dto';
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const valid = {
  especieId: '1',
  descripcion: '  Con collar rojo  ',
  direccion: ' Plaza ',
  fechaAvistamiento: '2020-01-01T12:00:00-04:00',
  latitud: '-17.78',
  longitud: '-63.18',
};
describe('Avistamiento DTO', () => {
  it('transforma multipart, recorta texto y mantiene UTC explicito', async () => {
    const dto = (await pipe.transform(valid, {
      type: 'body',
      metatype: CreateAvistamientoDto,
    })) as CreateAvistamientoDto;
    expect(dto.especieId).toBe(1);
    expect(dto.latitud).toBe(-17.78);
    expect(dto.descripcion).toBe('Con collar rojo');
    expect(dto.direccion).toBe('Plaza');
  });
  it.each([
    { latitud: '' },
    { latitud: true },
    { latitud: 91 },
    { longitud: -181 },
    { especieId: 1.5 },
    { descripcion: '  ' },
    { direccion: '  ' },
    { fechaAvistamiento: '2999-01-01T00:00:00Z' },
    { fechaAvistamiento: '2020-01-01T12:00:00' },
    { usuarioId: 'other' },
    { estado: 'CERRADO' },
    { descripcion: 'x'.repeat(2001) },
    { direccion: 'x'.repeat(256) },
  ])('rechaza campos invalidos %j', async (invalid) => {
    await expect(
      pipe.transform(
        { ...valid, ...invalid },
        { type: 'body', metatype: CreateAvistamientoDto },
      ),
    ).rejects.toThrow();
  });
  it.each([
    'especieId',
    'descripcion',
    'direccion',
    'fechaAvistamiento',
    'latitud',
    'longitud',
  ])('edicion no permite null en %s', async (field) => {
    await expect(
      pipe.transform(
        { [field]: null },
        { type: 'body', metatype: UpdateAvistamientoDto },
      ),
    ).rejects.toThrow();
  });
  it('permite edicion parcial y rechaza estado/metadatos en acciones', async () => {
    await expect(
      pipe.transform(
        { latitud: 0 },
        { type: 'body', metatype: UpdateAvistamientoDto },
      ),
    ).resolves.toMatchObject({ latitud: 0 });
    await expect(
      pipe.transform(
        { estado: 'ACTIVO' },
        { type: 'body', metatype: AvistamientoActionDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { storageKey: 'other' },
        { type: 'body', metatype: AvistamientoActionDto },
      ),
    ).rejects.toThrow();
  });
});
