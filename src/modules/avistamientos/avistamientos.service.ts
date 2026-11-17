import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CloudinaryService } from '../almacenamiento/cloudinary.service';
import { ArchivoPendiente } from '../almacenamiento/entities/archivo-pendiente.entity';
import {
  MAX_PHOTOS,
  validatePhotos,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { LimpiezaArchivosService } from '../almacenamiento/limpieza-archivos.service';
import { Especie } from '../especies/entities/especie.entity';
import { CreateAvistamientoDto } from './dto/create-avistamiento.dto';
import { UpdateAvistamientoDto } from './dto/update-avistamiento.dto';
import { EstadoAvistamiento } from './enums/estado-avistamiento.enum';
import { Avistamiento } from './entities/avistamiento.entity';
import { FotoAvistamiento } from './entities/foto-avistamiento.entity';

@Injectable()
export class AvistamientosService {
  constructor(
    @InjectRepository(Avistamiento)
    private readonly avistamientos: Repository<Avistamiento>,
    @InjectRepository(Especie) private readonly especies: Repository<Especie>,
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly limpieza: LimpiezaArchivosService,
  ) {}

  async create(
    usuarioId: string,
    dto: CreateAvistamientoDto,
    files?: ImageUpload[],
  ) {
    validatePhotos(files);
    const fechaAvistamiento = this.validateDate(dto.fechaAvistamiento);
    await this.assertSpecies(dto.especieId);
    const uploaded = await this.upload(usuarioId, files);
    const id = await this.dataSource.transaction(async (manager) => {
      await this.consumeIntents(manager, uploaded);
      const avistamiento = await manager.save(
        Avistamiento,
        manager.create(Avistamiento, {
          ...dto,
          fechaAvistamiento,
          usuarioId,
          estado: EstadoAvistamiento.ACTIVO,
        }),
      );
      await this.savePhotos(manager, avistamiento.id, uploaded, true);
      return avistamiento.id;
    });
    return this.findOne(id, usuarioId);
  }

  async findAll(pagination: PaginationDto = {}) {
    const records = await this.avistamientos.find({
      where: { estado: EstadoAvistamiento.ACTIVO },
      relations: { especie: true, fotos: true },
      take: pagination.limit ?? 10,
      skip: pagination.offset ?? 0,
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return records.map((item) => this.toResponse(item));
  }

  async findMine(usuarioId: string, pagination: PaginationDto = {}) {
    const records = await this.avistamientos.find({
      where: { usuarioId },
      relations: { especie: true, fotos: true },
      take: pagination.limit ?? 10,
      skip: pagination.offset ?? 0,
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return records.map((item) => this.toResponse(item, usuarioId));
  }

  async findOne(id: string, usuarioId?: string) {
    const item = await this.avistamientos.findOne({
      where: { id },
      relations: { especie: true, fotos: true },
    });
    if (
      !item ||
      (item.estado !== EstadoAvistamiento.ACTIVO &&
        item.usuarioId !== usuarioId)
    )
      throw new NotFoundException('Avistamiento no encontrado.');
    return this.toResponse(item, usuarioId);
  }

  async update(usuarioId: string, id: string, dto: UpdateAvistamientoDto) {
    await this.assertEditable(usuarioId, id);
    if (dto.especieId !== undefined) await this.assertSpecies(dto.especieId);
    const fechaAvistamiento =
      dto.fechaAvistamiento === undefined
        ? undefined
        : this.validateDate(dto.fechaAvistamiento);
    await this.dataSource.transaction(async (manager) => {
      const item = await this.ownedForUpdate(manager, usuarioId, id);
      await manager.save(Avistamiento, {
        ...item,
        ...dto,
        fechaAvistamiento: fechaAvistamiento ?? item.fechaAvistamiento,
      });
    });
    return this.findOne(id, usuarioId);
  }

  async close(usuarioId: string, id: string) {
    await this.changeState(usuarioId, id, EstadoAvistamiento.CERRADO);
    return this.findOne(id, usuarioId);
  }

  async cancel(usuarioId: string, id: string) {
    await this.changeState(usuarioId, id, EstadoAvistamiento.CANCELADO);
    return this.findOne(id, usuarioId);
  }

  async addPhotos(usuarioId: string, id: string, files?: ImageUpload[]) {
    validatePhotos(files);
    const current = await this.assertEditable(usuarioId, id);
    if (current.fotos.length + files.length > MAX_PHOTOS)
      throw new BadRequestException(
        'El avistamiento puede tener como máximo 5 fotografías.',
      );
    const uploaded = await this.upload(usuarioId, files);
    await this.dataSource.transaction(async (manager) => {
      await this.consumeIntents(manager, uploaded);
      await this.ownedForUpdate(manager, usuarioId, id);
      // Recheck under the parent lock: simultaneous uploads cannot exceed the cap.
      const count = await manager.countBy(FotoAvistamiento, {
        avistamientoId: id,
      });
      if (count + uploaded.length > MAX_PHOTOS)
        throw new BadRequestException(
          'El avistamiento puede tener como máximo 5 fotografías.',
        );
      await this.savePhotos(manager, id, uploaded, count === 0);
    });
    return this.findOne(id, usuarioId);
  }

  async removePhoto(usuarioId: string, id: string, fotoId: string) {
    const taskId = await this.dataSource.transaction(async (manager) => {
      await this.ownedForUpdate(manager, usuarioId, id);
      const photos = await manager.find(FotoAvistamiento, {
        where: { avistamientoId: id },
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      const photo = photos.find((item) => item.id === fotoId);
      if (!photo) throw new NotFoundException('Fotografía no encontrada.');
      if (photos.length <= 1)
        throw new BadRequestException(
          'El avistamiento debe conservar al menos una fotografía.',
        );
      const task = await manager.save(
        ArchivoPendiente,
        manager.create(ArchivoPendiente, {
          storageKey: photo.storageKey,
          disponibleDesde: new Date(),
        }),
      );
      await manager.delete(FotoAvistamiento, {
        id: fotoId,
        avistamientoId: id,
      });
      if (photo.esPrincipal) {
        const next = photos.find((item) => item.id !== fotoId)!;
        await manager.update(
          FotoAvistamiento,
          { id: next.id, avistamientoId: id },
          { esPrincipal: true },
        );
      }
      return task.id;
    });
    const completed = await this.limpieza.processOne(taskId);
    return { eliminada: true, limpiezaPendiente: !completed };
  }

  private toResponse(item: Avistamiento, usuarioId?: string) {
    return {
      id: item.id,
      especieId: item.especieId,
      especie: item.especie
        ? { id: item.especie.id, nombre: item.especie.nombre }
        : null,
      descripcion: item.descripcion,
      direccion: item.direccion,
      fechaAvistamiento: item.fechaAvistamiento,
      latitud: Number(item.latitud),
      longitud: Number(item.longitud),
      estado: item.estado,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      esPropio: item.usuarioId === usuarioId,
      fotos: [...(item.fotos ?? [])]
        .sort(
          (a, b) =>
            Number(b.esPrincipal) - Number(a.esPrincipal) ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.id.localeCompare(b.id),
        )
        .map((foto) => ({
          id: foto.id,
          url: foto.url,
          esPrincipal: foto.esPrincipal,
          createdAt: foto.createdAt,
        })),
    };
  }

  private validateDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now())
      throw new BadRequestException(
        'La fecha de avistamiento debe ser válida y no futura.',
      );
    return date;
  }

  private async assertEditable(usuarioId: string, id: string) {
    const item = await this.avistamientos.findOne({
      where: { id, usuarioId },
      relations: { fotos: true },
    });
    if (!item) throw new NotFoundException('Avistamiento no encontrado.');
    if (item.estado !== EstadoAvistamiento.ACTIVO)
      throw new ConflictException(
        'Solo puedes modificar avistamientos activos.',
      );
    return item;
  }

  private async changeState(
    usuarioId: string,
    id: string,
    estado: EstadoAvistamiento.CERRADO | EstadoAvistamiento.CANCELADO,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const item = await this.ownedForUpdate(manager, usuarioId, id);
      item.estado = estado;
      await manager.save(Avistamiento, item);
    });
  }

  private async assertSpecies(especieId: number) {
    if (!(await this.especies.existsBy({ id: especieId })))
      throw new BadRequestException('La especie seleccionada no existe.');
  }

  private async ownedForUpdate(
    manager: EntityManager,
    usuarioId: string,
    id: string,
  ) {
    const avistamiento = await manager.findOne(Avistamiento, {
      where: { id, usuarioId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!avistamiento)
      throw new NotFoundException('Avistamiento no encontrado.');
    if (avistamiento.estado !== EstadoAvistamiento.ACTIVO)
      throw new ConflictException(
        'Solo puedes modificar avistamientos activos.',
      );
    return avistamiento;
  }

  private async upload(usuarioId: string, files: ImageUpload[]) {
    // Persist compensation before any remote side effect, including ambiguous timeouts.
    const tasks = files.map(() => ({
      id: randomUUID(),
      storageKey: `smartpet/avistamientos/${usuarioId}/${randomUUID()}`,
      disponibleDesde: new Date(Date.now() + 15 * 60000),
    }));
    await this.dataSource.getRepository(ArchivoPendiente).save(tasks);
    const uploaded: { url: string; storageKey: string; taskId: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const photo = await this.cloudinary.upload(files[i], tasks[i].storageKey);
      uploaded.push({ ...photo, taskId: tasks[i].id });
    }
    return uploaded;
  }

  private async consumeIntents(
    manager: EntityManager,
    photos: { taskId: string }[],
  ) {
    // Delete/lock intents first; a cleanup worker must not race the reference commit.
    const result = await manager.delete(ArchivoPendiente, {
      id: In(photos.map((photo) => photo.taskId)),
    });
    if (result.affected !== photos.length)
      throw new ServiceUnavailableException(
        'La subida expiró. Vuelve a enviar las fotografías.',
      );
  }

  private async savePhotos(
    manager: EntityManager,
    avistamientoId: string,
    photos: { url: string; storageKey: string }[],
    firstIsPrincipal: boolean,
  ) {
    const entities = photos.map((photo, index) =>
      manager.create(FotoAvistamiento, {
        avistamientoId,
        url: photo.url,
        storageKey: photo.storageKey,
        proveedor: 'CLOUDINARY',
        esPrincipal: firstIsPrincipal && index === 0,
      }),
    );
    await manager.save(FotoAvistamiento, entities);
  }
}
