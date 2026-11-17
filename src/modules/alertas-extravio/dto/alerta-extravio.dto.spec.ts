import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateAlertaExtravioDto } from './create-alerta-extravio.dto';
import { UpdateAlertaExtravioDto } from './update-alerta-extravio.dto';
import { CambioEstadoAlertaDto } from './cambio-estado-alerta.dto';

describe('Alertas extravío DTO', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const base = {
    mascotaId: randomUUID(),
    fechaExtravio: '2020-01-02T12:00:00-04:00',
    latitud: -17.7833,
    longitud: -63.1821,
  };
  const create = (fields: object) =>
    pipe.transform(
      { ...base, ...fields },
      { type: 'body', metatype: CreateAlertaExtravioDto },
    );
  const update = (fields: object) =>
    pipe.transform(fields, { type: 'body', metatype: UpdateAlertaExtravioDto });

  it('admite valores geográficos extremos, cero, texto recortado y fechas con zona', async () => {
    await expect(
      create({
        descripcion: '  Cerca de la plaza  ',
        latitud: 90,
        longitud: -180,
      }),
    ).resolves.toMatchObject({
      descripcion: 'Cerca de la plaza',
      latitud: 90,
      longitud: -180,
    });
    await expect(
      create({
        latitud: 0,
        longitud: 0,
        fechaExtravio: '2020-01-02T16:00:00Z',
      }),
    ).resolves.toBeInstanceOf(CreateAlertaExtravioDto);
  });

  it.each([
    { mascotaId: 'invalid' },
    { mascotaId: null },
    { descripcion: 1 },
    { descripcion: 'x'.repeat(2001) },
    { latitud: 90.1 },
    { latitud: -90.1 },
    { latitud: '1' },
    { latitud: true },
    { latitud: null },
    { latitud: 0.123456789 },
    { longitud: 180.1 },
    { longitud: -180.1 },
    { longitud: '' },
    { longitud: null },
    { fechaExtravio: 'not-a-date' },
    { fechaExtravio: '2020-02-30T12:00:00Z' },
    { fechaExtravio: '2020-01-01' },
    { fechaExtravio: '2020-01-01T12:00:00' },
    { fechaExtravio: null },
    { fechaExtravio: '2999-01-01T00:00:00Z' },
    { estado: 'RESUELTA' },
    { fechaResolucion: '2020-01-01T00:00:00Z' },
    { fecha_resolucion: '2020-01-01T00:00:00Z' },
    { createdAt: '2020-01-01' },
    { updated_at: '2020-01-01' },
    { usuarioId: randomUUID() },
    { mascota_id: randomUUID() },
    { radio_km: 10 },
    { fotos: [] },
  ])(
    'rechaza datos inválidos y campos controlados por el servidor: %j',
    async (fields) => {
      await expect(create(fields)).rejects.toThrow();
    },
  );

  it('PATCH solo admite cuatro campos y únicamente descripcion puede ser null', async () => {
    await expect(update({})).resolves.toBeInstanceOf(UpdateAlertaExtravioDto);
    await expect(
      update({ descripcion: null, latitud: 0, longitud: 0 }),
    ).resolves.toMatchObject({ descripcion: null, latitud: 0, longitud: 0 });
    for (const fields of [
      { mascotaId: base.mascotaId },
      { estado: 'CANCELADA' },
      { fechaExtravio: null },
      { latitud: null },
      { longitud: null },
    ]) {
      await expect(update(fields)).rejects.toThrow();
    }
  });

  it('resolver y cancelar no aceptan estado ni fecha enviados por el cliente', async () => {
    await expect(
      pipe.transform({}, { type: 'body', metatype: CambioEstadoAlertaDto }),
    ).resolves.toBeInstanceOf(CambioEstadoAlertaDto);
    await expect(
      pipe.transform(
        { estado: 'OCULTA' },
        { type: 'body', metatype: CambioEstadoAlertaDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { fechaResolucion: base.fechaExtravio },
        { type: 'body', metatype: CambioEstadoAlertaDto },
      ),
    ).rejects.toThrow();
  });
});
