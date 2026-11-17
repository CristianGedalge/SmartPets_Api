import { ValidationPipe } from '@nestjs/common';
import {
  CreatePublicacionAdopcionDto,
  UpdatePublicacionAdopcionDto,
  AdopcionActionDto,
} from './publicacion-adopcion.dto';
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const valid = {
  animalResguardadoId: '9503a593-7d6f-4fb1-aa7f-a6ee2f678e13',
  descripcion: '  Busca un hogar  ',
};
describe('Publicacion adopcion DTO', () => {
  it('recorta descripcion y acepta requisitos opcionales', async () => {
    await expect(
      pipe.transform(valid, {
        type: 'body',
        metatype: CreatePublicacionAdopcionDto,
      }),
    ).resolves.toMatchObject({ descripcion: 'Busca un hogar' });
  });
  it.each([
    { descripcion: '  ' },
    { descripcion: null },
    { descripcion: 'x'.repeat(2001) },
    { requisitos: 'x'.repeat(2001) },
    { animalResguardadoId: 'invalid' },
    { establecimientoId: valid.animalResguardadoId },
    { estado: 'ADOPTADA' },
  ])('rechaza datos invalidos %j', async (invalid) => {
    await expect(
      pipe.transform(
        { ...valid, ...invalid },
        { type: 'body', metatype: CreatePublicacionAdopcionDto },
      ),
    ).rejects.toThrow();
  });
  it('edicion no mueve el animal ni anula descripcion, pero permite quitar requisitos', async () => {
    await expect(
      pipe.transform(
        { animalResguardadoId: valid.animalResguardadoId },
        { type: 'body', metatype: UpdatePublicacionAdopcionDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { descripcion: null },
        { type: 'body', metatype: UpdatePublicacionAdopcionDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { requisitos: null },
        { type: 'body', metatype: UpdatePublicacionAdopcionDto },
      ),
    ).resolves.toMatchObject({ requisitos: null });
  });
  it('acciones no aceptan estados ni fechas del cliente', async () => {
    await expect(
      pipe.transform(
        { estado: 'ADOPTADA' },
        { type: 'body', metatype: AdopcionActionDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { fechaAdopcion: '2020-01-01' },
        { type: 'body', metatype: AdopcionActionDto },
      ),
    ).rejects.toThrow();
  });
});
