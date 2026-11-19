import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AlertaExtravio } from '../alertas-extravio/entities/alerta-extravio.entity';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { AnaliticaService } from './analitica.service';
import { MapaCalorDto } from './dto/mapa-calor.dto';

describe('Filtros de analítica', () => {
  it.each([
    { tipo: 'OTRO' },
    { estado: 'OCULTA' },
    { desde: 'ayer' },
    { desde: ['2026-01-01'] },
    { hasta: '2026-1-1' },
    { usuarioId: 'ajeno' },
  ])('rechaza entradas no admitidas: %j', async (input) => {
    const errors = await validate(plainToInstance(MapaCalorDto, input), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('admite los filtros documentados y aplica el tipo predeterminado', async () => {
    const dto = plainToInstance(MapaCalorDto, {
      desde: '2024-02-29',
      estado: 'TODOS',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.tipo).toBe('ALERTAS');
  });

  it.each([
    { desde: '2026-02-29' },
    { hasta: '2026-04-31' },
    { desde: '2026-12-01', hasta: '2026-01-01' },
    { tipo: 'ALERTAS', estado: 'CERRADO' },
    { tipo: 'AVISTAMIENTOS', estado: 'ACTIVA' },
  ])(
    'rechaza calendario, intervalos o estados incompatibles: %j',
    async (input) => {
      const service = new AnaliticaService(
        {} as Repository<AlertaExtravio>,
        {} as Repository<Avistamiento>,
      );
      await expect(
        service.mapaCalor(plainToInstance(MapaCalorDto, input)),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rechaza más de 5000 zonas sin truncarlas silenciosamente', async () => {
    const builder: Record<string, jest.Mock> = {};
    for (const name of [
      'innerJoin',
      'where',
      'andWhere',
      'select',
      'addSelect',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'limit',
    ])
      builder[name] = jest.fn().mockReturnValue(builder);
    builder.getRawMany = jest.fn().mockResolvedValue(
      Array.from({ length: 5001 }, () => ({
        latitud: '1',
        longitud: '2',
        cantidad: '1',
      })),
    );
    const service = new AnaliticaService(
      {
        createQueryBuilder: () => builder,
      } as unknown as Repository<AlertaExtravio>,
      {} as Repository<Avistamiento>,
    );
    await expect(service.mapaCalor(new MapaCalorDto())).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
