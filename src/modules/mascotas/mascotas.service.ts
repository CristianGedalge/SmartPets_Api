import {
  AnimalResguardado,
  EstadoResguardo,
} from '../resguardo/entities/animal-resguardado.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { UpdateMascotaDto } from './dto/update-mascota.dto';
import { Mascota } from './entities/mascota.entity';
import { FotoMascota } from './entities/foto-mascota.entity';

@Injectable()
export class MascotasService {
  constructor(
    @InjectRepository(Mascota) private readonly mascotas: Repository<Mascota>,
    @InjectRepository(Especie) private readonly especies: Repository<Especie>,
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly limpieza: LimpiezaArchivosService,
  ) {}

  async create(
    usuarioId: string,
    dto: CreateMascotaDto,
    files?: ImageUpload[],
    establecimientoId?: string,
  ) {
    validatePhotos(files);
    await this.assertSpecies(dto.especieId);
    const uploaded = await this.upload(usuarioId, files);
    const id = await this.dataSource.transaction(async (manager) => {
      if (establecimientoId)
        await this.lockEstablishment(manager, usuarioId, establecimientoId);
      await this.consumeIntents(manager, uploaded);
      const mascota = await manager.save(
        Mascota,
        manager.create(Mascota, { ...dto, usuarioId, estado: true }),
      );
      await this.savePhotos(manager, mascota.id, uploaded, true);
      if (establecimientoId)
        await manager.save(
          AnimalResguardado,
          manager.create(AnimalResguardado, {
            mascotaId: mascota.id,
            establecimientoId,
            estado: EstadoResguardo.EN_RESGUARDO,
          }),
        );
      return mascota.id;
    });
    return this.findOne(usuarioId, id);
  }

  async findAll(usuarioId: string, pagination: PaginationDto = {}) {
    const mascotas = await this.mascotas.find({
      where: { usuarioId, estado: true },
      relations: { especie: true, fotos: true },
      take: pagination.limit ?? 10,
      skip: pagination.offset ?? 0,
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    return mascotas.map((mascota) => this.publicPet(mascota));
  }

  async findOne(usuarioId: string, id: string) {
    const mascota = await this.mascotas.findOne({
      where: { id, usuarioId, estado: true },
      relations: { especie: true, fotos: true },
    });
    if (!mascota) throw new NotFoundException('Mascota no encontrada.');
    return this.publicPet(mascota);
  }

  async update(usuarioId: string, id: string, dto: UpdateMascotaDto) {
    // Verify ownership before species lookup, so foreign resource details are not exposed.
    await this.findOne(usuarioId, id);
    if (dto.especieId !== undefined) await this.assertSpecies(dto.especieId);
    await this.dataSource.transaction(async (manager) => {
      const mascota = await this.ownedForUpdate(manager, usuarioId, id);
      await manager.save(Mascota, { ...mascota, ...dto });
    });
    return this.findOne(usuarioId, id);
  }

  async remove(usuarioId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const mascota = await this.ownedForUpdate(manager, usuarioId, id);
      mascota.estado = false;
      return manager.save(Mascota, mascota);
    });
  }

  async addPhotos(usuarioId: string, id: string, files?: ImageUpload[]) {
    validatePhotos(files);
    const current = await this.findOne(usuarioId, id);
    if (current.fotos.length + files.length > MAX_PHOTOS)
      throw new BadRequestException(
        'La mascota puede tener como máximo 5 fotografías.',
      );
    const uploaded = await this.upload(usuarioId, files);
    await this.dataSource.transaction(async (manager) => {
      await this.consumeIntents(manager, uploaded);
      await this.ownedForUpdate(manager, usuarioId, id);
      // Recheck under the parent lock: simultaneous uploads cannot exceed the cap.
      const count = await manager.countBy(FotoMascota, { mascotaId: id });
      if (count + uploaded.length > MAX_PHOTOS)
        throw new BadRequestException(
          'La mascota puede tener como máximo 5 fotografías.',
        );
      await this.savePhotos(manager, id, uploaded, count === 0);
    });
    return this.findOne(usuarioId, id);
  }

  async removePhoto(usuarioId: string, id: string, fotoId: string) {
    const taskId = await this.dataSource.transaction(async (manager) => {
      await this.ownedForUpdate(manager, usuarioId, id);
      const photos = await manager.find(FotoMascota, {
        where: { mascotaId: id },
        order: { createdAt: 'ASC', id: 'ASC' },
      });
      const photo = photos.find((item) => item.id === fotoId);
      if (!photo) throw new NotFoundException('Fotografía no encontrada.');
      if (photos.length <= 1)
        throw new BadRequestException(
          'La mascota debe conservar al menos una fotografía.',
        );
      const task = await manager.save(
        ArchivoPendiente,
        manager.create(ArchivoPendiente, {
          storageKey: photo.storageKey,
          disponibleDesde: new Date(),
        }),
      );
      await manager.delete(FotoMascota, { id: fotoId, mascotaId: id });
      if (photo.esPrincipal) {
        const next = photos.find((item) => item.id !== fotoId)!;
        await manager.update(
          FotoMascota,
          { id: next.id, mascotaId: id },
          { esPrincipal: true },
        );
      }
      return task.id;
    });
    const completed = await this.limpieza.processOne(taskId);
    return { eliminada: true, limpiezaPendiente: !completed };
  }

  private publicPet(mascota: Mascota) {
    return {
      ...mascota,
      pesoKg: mascota.pesoKg == null ? null : Number(mascota.pesoKg),
      fotos: [...(mascota.fotos ?? [])].sort(
        (a, b) =>
          Number(b.esPrincipal) - Number(a.esPrincipal) ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
          a.id.localeCompare(b.id),
      ),
    };
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
    const reference = await manager.findOne(Mascota, {
      where: { id, usuarioId, estado: true },
    });
    if (!reference) throw new NotFoundException('Mascota no encontrada.');
    const custody = await manager.findOne(AnimalResguardado, {
      where: { mascotaId: id },
    });
    if (custody)
      await this.lockEstablishment(
        manager,
        usuarioId,
        custody.establecimientoId,
      );
    const mascota = await manager.findOne(Mascota, {
      where: { id, usuarioId, estado: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!mascota) throw new NotFoundException('Mascota no encontrada.');
    if (custody) {
      const locked = await manager.findOne(AnimalResguardado, {
        where: { id: custody.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.estado !== EstadoResguardo.EN_RESGUARDO)
        throw new ConflictException(
          'El animal ya fue adoptado y su ficha es de solo lectura.',
        );
    }
    return mascota;
  }

  private async lockEstablishment(
    manager: EntityManager,
    usuarioId: string,
    id: string,
  ) {
    const establishment = await manager.findOne(Establecimiento, {
      where: { id, usuarioId, estado: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!establishment)
      throw new ForbiddenException(
        'Necesitas un establecimiento activo para gestionar animales resguardados.',
      );
    return establishment;
  }

  private async upload(usuarioId: string, files: ImageUpload[]) {
    // Persist compensation before any remote side effect, including ambiguous timeouts.
    const tasks = files.map(() => ({
      id: randomUUID(),
      storageKey: `smartpet/mascotas/${usuarioId}/${randomUUID()}`,
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
    mascotaId: string,
    photos: { url: string; storageKey: string }[],
    firstIsPrincipal: boolean,
  ) {
    const entities = photos.map((photo, index) =>
      manager.create(FotoMascota, {
        mascotaId,
        url: photo.url,
        storageKey: photo.storageKey,
        proveedor: 'CLOUDINARY',
        esPrincipal: firstIsPrincipal && index === 0,
      }),
    );
    await manager.save(FotoMascota, entities);
  }
}
