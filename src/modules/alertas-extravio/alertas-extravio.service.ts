import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { CreateAlertaExtravioDto } from './dto/create-alerta-extravio.dto';
import { UpdateAlertaExtravioDto } from './dto/update-alerta-extravio.dto';
import { AlertaExtravio } from './entities/alerta-extravio.entity';
import { EstadoAlerta } from './enums/estado-alerta.enum';

@Injectable()
export class AlertasExtravioService {
  constructor(
    @InjectRepository(AlertaExtravio)
    private readonly alertas: Repository<AlertaExtravio>,
    private readonly dataSource: DataSource,
  ) {}

  async create(usuarioId: string, dto: CreateAlertaExtravioDto) {
    const fechaExtravio = this.validateDate(dto.fechaExtravio);
    const id = await this.dataSource.transaction(async (manager) => {
      const mascota = await manager.findOne(Mascota, {
        where: { id: dto.mascotaId, usuarioId, estado: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mascota) throw new NotFoundException('Mascota no encontrada.');
      if (
        await manager.existsBy(AlertaExtravio, {
          mascotaId: mascota.id,
          estado: EstadoAlerta.ACTIVA,
        })
      ) {
        throw new ConflictException('La mascota ya tiene una alerta activa.');
      }
      const alerta = await manager.save(
        AlertaExtravio,
        manager.create(AlertaExtravio, {
          mascotaId: mascota.id,
          descripcion: dto.descripcion ?? null,
          fechaExtravio,
          latitud: dto.latitud,
          longitud: dto.longitud,
          estado: EstadoAlerta.ACTIVA,
          fechaResolucion: null,
        }),
      );
      return alerta.id;
    });
    return this.findOne(id, usuarioId);
  }

  async findAll(pagination: PaginationDto = {}) {
    const alerts = await this.queryWithPet()
      .where('alerta.estado = :estado', { estado: EstadoAlerta.ACTIVA })
      .andWhere('mascota.estado = true')
      .orderBy('alerta.createdAt', 'DESC')
      .addOrderBy('alerta.id', 'ASC')
      .take(pagination.limit ?? 10)
      .skip(pagination.offset ?? 0)
      .getMany();
    return alerts.map((alerta) => this.toResponse(alerta));
  }

  async findMine(usuarioId: string, pagination: PaginationDto = {}) {
    const alerts = await this.queryWithPet()
      .where('mascota.usuarioId = :usuarioId', { usuarioId })
      .orderBy('alerta.createdAt', 'DESC')
      .addOrderBy('alerta.id', 'ASC')
      .take(pagination.limit ?? 10)
      .skip(pagination.offset ?? 0)
      .getMany();
    return alerts.map((alerta) => this.toResponse(alerta));
  }

  async findOne(id: string, usuarioId?: string) {
    const alerta = await this.queryWithPet()
      .where('alerta.id = :id', { id })
      .getOne();
    if (
      !alerta ||
      !(
        alerta.mascota.usuarioId === usuarioId ||
        (alerta.estado === EstadoAlerta.ACTIVA && alerta.mascota.estado)
      )
    ) {
      throw new NotFoundException('Alerta no encontrada.');
    }
    return this.toResponse(alerta);
  }

  async update(usuarioId: string, id: string, dto: UpdateAlertaExtravioDto) {
    const fechaExtravio =
      dto.fechaExtravio === undefined
        ? undefined
        : this.validateDate(dto.fechaExtravio);
    await this.dataSource.transaction(async (manager) => {
      const alerta = await this.ownedActiveForUpdate(manager, usuarioId, id);
      if (dto.descripcion !== undefined) alerta.descripcion = dto.descripcion;
      if (fechaExtravio !== undefined) alerta.fechaExtravio = fechaExtravio;
      if (dto.latitud !== undefined) alerta.latitud = dto.latitud;
      if (dto.longitud !== undefined) alerta.longitud = dto.longitud;
      await manager.save(AlertaExtravio, alerta);
    });
    return this.findOne(id, usuarioId);
  }

  async resolve(usuarioId: string, id: string) {
    await this.changeState(usuarioId, id, EstadoAlerta.RESUELTA);
    return this.findOne(id, usuarioId);
  }

  async cancel(usuarioId: string, id: string) {
    await this.changeState(usuarioId, id, EstadoAlerta.CANCELADA);
    return this.findOne(id, usuarioId);
  }

  private queryWithPet() {
    return this.alertas
      .createQueryBuilder('alerta')
      .innerJoinAndSelect('alerta.mascota', 'mascota')
      .leftJoinAndSelect('mascota.especie', 'especie')
      .leftJoinAndSelect(
        'mascota.fotos',
        'foto',
        'foto.esPrincipal = :principal',
        { principal: true },
      );
  }

  private toResponse(alerta: AlertaExtravio) {
    const mascota = alerta.mascota;
    const principal = mascota.fotos?.find((foto) => foto.esPrincipal);
    return {
      id: alerta.id,
      mascotaId: alerta.mascotaId,
      descripcion: alerta.descripcion,
      fechaExtravio: alerta.fechaExtravio,
      latitud: Number(alerta.latitud),
      longitud: Number(alerta.longitud),
      estado: alerta.estado,
      fechaResolucion: alerta.fechaResolucion,
      createdAt: alerta.createdAt,
      updatedAt: alerta.updatedAt,
      mascota: {
        id: mascota.id,
        nombre: mascota.nombre,
        especie: mascota.especie
          ? { id: mascota.especie.id, nombre: mascota.especie.nombre }
          : null,
        razaNombre: mascota.razaNombre,
        sexo: mascota.sexo,
        color: mascota.color,
        edadAproximadaMeses: mascota.edadAproximadaMeses,
        estado: mascota.estado,
        fotoPrincipal: principal
          ? { id: principal.id, url: principal.url }
          : null,
      },
    };
  }

  private validateDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now()) {
      throw new BadRequestException(
        'La fecha de extravío debe ser válida y no puede ser futura.',
      );
    }
    return date;
  }

  private async ownedActiveForUpdate(
    manager: EntityManager,
    usuarioId: string,
    id: string,
  ) {
    const reference = await manager.findOne(AlertaExtravio, {
      where: { id },
      select: { id: true, mascotaId: true },
    });
    if (!reference) throw new NotFoundException('Alerta no encontrada.');
    // All mutations lock the parent first, matching pet updates and alert creation.
    const mascota = await manager.findOne(Mascota, {
      where: { id: reference.mascotaId, usuarioId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!mascota) throw new NotFoundException('Alerta no encontrada.');
    const alerta = await manager.findOne(AlertaExtravio, {
      where: { id, mascotaId: mascota.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!alerta) throw new NotFoundException('Alerta no encontrada.');
    if (alerta.estado !== EstadoAlerta.ACTIVA)
      throw new ConflictException(
        'Solo se pueden modificar o cerrar alertas activas.',
      );
    return alerta;
  }

  private async changeState(
    usuarioId: string,
    id: string,
    estado: EstadoAlerta.RESUELTA | EstadoAlerta.CANCELADA,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const alerta = await this.ownedActiveForUpdate(manager, usuarioId, id);
      alerta.estado = estado;
      alerta.fechaResolucion =
        estado === EstadoAlerta.RESUELTA ? new Date() : null;
      await manager.save(AlertaExtravio, alerta);
    });
  }
}
