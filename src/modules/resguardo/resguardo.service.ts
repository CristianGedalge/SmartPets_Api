import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { MascotasService } from '../mascotas/mascotas.service';
import { CreateMascotaDto } from '../mascotas/dto/create-mascota.dto';
import { UpdateMascotaDto } from '../mascotas/dto/update-mascota.dto';
import type { ImageUpload } from '../almacenamiento/image-upload';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { AnimalResguardado } from './entities/animal-resguardado.entity';
import { animalResponse } from './animal-response';
@Injectable()
export class ResguardoService {
  constructor(
    @InjectRepository(AnimalResguardado)
    private readonly animals: Repository<AnimalResguardado>,
    @InjectRepository(Establecimiento)
    private readonly establishments: Repository<Establecimiento>,
    @InjectRepository(PublicacionAdopcion)
    private readonly publications: Repository<PublicacionAdopcion>,
    private readonly pets: MascotasService,
  ) {}
  async create(user: string, dto: CreateMascotaDto, files?: ImageUpload[]) {
    const establishment = await this.establishment(user);
    const pet = await this.pets.create(user, dto, files, establishment.id);
    const animal = await this.animals.findOneByOrFail({
      mascotaId: pet.id,
      establecimientoId: establishment.id,
    });
    return this.findOne(user, animal.id);
  }
  async findAll(user: string, pagination: PaginationDto = {}) {
    const establishment = await this.establishment(user);
    const animals = await this.animals.find({
      where: {
        establecimientoId: establishment.id,
        mascota: { usuarioId: user, estado: true },
      },
      relations: { mascota: { especie: true, fotos: true } },
      order: { createdAt: 'DESC', id: 'ASC' },
      take: pagination.limit ?? 10,
      skip: pagination.offset ?? 0,
    });
    return Promise.all(animals.map((animal) => this.response(animal)));
  }
  async findOne(user: string, id: string) {
    return this.response(await this.owned(user, id));
  }
  async update(user: string, id: string, dto: UpdateMascotaDto) {
    const animal = await this.owned(user, id);
    await this.pets.update(user, animal.mascotaId, dto);
    return this.findOne(user, id);
  }
  async addPhotos(user: string, id: string, files?: ImageUpload[]) {
    const animal = await this.owned(user, id);
    await this.pets.addPhotos(user, animal.mascotaId, files);
    return this.findOne(user, id);
  }
  async removePhoto(user: string, id: string, fotoId: string) {
    const animal = await this.owned(user, id);
    return this.pets.removePhoto(user, animal.mascotaId, fotoId);
  }
  private async establishment(user: string) {
    const item = await this.establishments.findOneBy({
      usuarioId: user,
      estado: true,
    });
    if (!item)
      throw new ForbiddenException('Necesitas un establecimiento activo.');
    return item;
  }
  private async owned(user: string, id: string) {
    const establishment = await this.establishment(user);
    const animal = await this.animals.findOne({
      where: {
        id,
        establecimientoId: establishment.id,
        mascota: { usuarioId: user, estado: true },
      },
      relations: { mascota: { especie: true, fotos: true } },
    });
    if (!animal)
      throw new NotFoundException('Animal resguardado no encontrado.');
    return animal;
  }
  private async response(animal: AnimalResguardado) {
    const publication = await this.publications.findOneBy({
      animalResguardadoId: animal.id,
    });
    return {
      id: animal.id,
      estado: animal.estado,
      establecimientoId: animal.establecimientoId,
      mascota: animalResponse(animal.mascota),
      publicacion: publication
        ? {
            id: publication.id,
            descripcion: publication.descripcion,
            requisitos: publication.requisitos,
            estado: publication.estado,
            fechaAdopcion: publication.fechaAdopcion,
          }
        : null,
      createdAt: animal.createdAt,
      updatedAt: animal.updatedAt,
    };
  }
}
