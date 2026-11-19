import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertaExtravio } from '../alertas-extravio/entities/alerta-extravio.entity';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { MapaCalorDto } from './dto/mapa-calor.dto';

@Injectable()
export class AnaliticaService {
  constructor(
    @InjectRepository(AlertaExtravio)
    private readonly alertas: Repository<AlertaExtravio>,
    @InjectRepository(Avistamiento)
    private readonly avistamientos: Repository<Avistamiento>,
  ) {}

  async mapaCalor(dto: MapaCalorDto) {
    const alerts = dto.tipo === 'ALERTAS';
    const estado = dto.estado ?? (alerts ? 'ACTIVA' : 'ACTIVO');
    const estados = alerts
      ? ['ACTIVA', 'RESUELTA', 'CANCELADA', 'TODOS']
      : ['ACTIVO', 'CERRADO', 'CANCELADO', 'TODOS'];
    if (!estados.includes(estado)) {
      throw new BadRequestException(
        'El estado no corresponde al tipo de reporte seleccionado.',
      );
    }
    const desde = this.fecha(dto.desde);
    const hasta = this.fecha(dto.hasta);
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final.',
      );
    }
    const query = alerts
      ? this.alertas
          .createQueryBuilder('reporte')
          .innerJoin('reporte.mascota', 'mascota')
          .innerJoin('mascota.usuario', 'usuario')
          .where('mascota.estado = true')
          .andWhere('reporte.estado <> :oculta', { oculta: 'OCULTA' })
      : this.avistamientos
          .createQueryBuilder('reporte')
          .innerJoin('reporte.usuario', 'usuario')
          .where('1 = 1');
    query
      .andWhere('usuario.estado = true')
      .andWhere('reporte.latitud BETWEEN -85.05112878 AND 85.05112878')
      .andWhere('reporte.longitud BETWEEN -180 AND 180');
    if (estado !== 'TODOS')
      query.andWhere('reporte.estado = :estado', { estado });
    const campoFecha = alerts
      ? 'reporte.fechaExtravio'
      : 'reporte.fechaAvistamiento';
    if (desde) query.andWhere(`${campoFecha} >= :desde`, { desde });
    if (hasta)
      query.andWhere(`${campoFecha} < :fin`, {
        fin: new Date(hasta.getTime() + 86400000),
      });
    const rows = await query
      .select('ROUND(reporte.latitud, 3)', 'latitud')
      .addSelect('ROUND(reporte.longitud, 3)', 'longitud')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('ROUND(reporte.latitud, 3)')
      .addGroupBy('ROUND(reporte.longitud, 3)')
      .orderBy('latitud', 'ASC')
      .addOrderBy('longitud', 'ASC')
      .limit(5001)
      .getRawMany<{ latitud: string; longitud: string; cantidad: string }>();
    if (rows.length > 5000) {
      throw new UnprocessableEntityException(
        'Hay demasiadas zonas. Reduce el intervalo de fechas.',
      );
    }
    return {
      tipo: dto.tipo,
      estado,
      desde: dto.desde ?? null,
      hasta: dto.hasta ?? null,
      totalReportes: rows.reduce((sum, row) => sum + Number(row.cantidad), 0),
      datos: {
        type: 'FeatureCollection' as const,
        features: rows.map((row) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [Number(row.longitud), Number(row.latitud)],
          },
          properties: { cantidad: Number(row.cantidad) },
        })),
      },
    };
  }

  private fecha(value: string | undefined): Date | undefined {
    if (!value) return;
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(
        'La fecha debe ser una fecha válida en formato AAAA-MM-DD.',
      );
    }
    return new Date(`${value}T00:00:00-04:00`);
  }
}
