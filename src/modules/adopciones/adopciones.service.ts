import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Adopcion } from './entities/adopcion.entity';
import { RegistrarAdopcionDto } from './dto/registrar-adopcion.dto';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import {
  AnimalResguardado,
  EstadoResguardo,
} from '../resguardo/entities/animal-resguardado.entity';
import {
  animalResponse,
  establishmentResponse,
} from '../resguardo/animal-response';
import {
  PublicacionAdopcion,
  EstadoAdopcion,
} from './entities/publicacion-adopcion.entity';
import {
  CreatePublicacionAdopcionDto,
  UpdatePublicacionAdopcionDto,
} from './dto/publicacion-adopcion.dto';
@Injectable()
export class AdopcionesService {
  constructor(
    @InjectRepository(PublicacionAdopcion)
    private readonly publications: Repository<PublicacionAdopcion>,
    private readonly ds: DataSource,
  ) {}
  async create(user: string, dto: CreatePublicacionAdopcionDto) {
    const id = await this.ds.transaction(async (manager) => {
      const animal = await this.lockAnimal(
        manager,
        user,
        dto.animalResguardadoId,
      );
      if (
        await manager.existsBy(PublicacionAdopcion, {
          animalResguardadoId: animal.id,
        })
      )
        throw new ConflictException(
          'Este animal ya tiene una publicacion. Gestiona la existente.',
        );
      const publication = await manager.save(
        PublicacionAdopcion,
        manager.create(PublicacionAdopcion, {
          animalResguardadoId: animal.id,
          descripcion: dto.descripcion,
          requisitos: dto.requisitos ?? null,
          estado: EstadoAdopcion.PUBLICADA,
          fechaAdopcion: null,
        }),
      );
      return publication.id;
    });
    return this.findOwned(user, id);
  }
  async findAll(pagination: PaginationDto = {}) {
    const items = await this.query()
      .where('publication.estado = :state', { state: EstadoAdopcion.PUBLICADA })
      .andWhere('animal.estado = :custody', {
        custody: EstadoResguardo.EN_RESGUARDO,
      })
      .andWhere('mascota.estado = true')
      .andWhere('establishment.estado = true')
      .andWhere('owner.estado = true')
      .orderBy('publication.createdAt', 'DESC')
      .addOrderBy('publication.id', 'ASC')
      .take(pagination.limit ?? 10)
      .skip(pagination.offset ?? 0)
      .getMany();
    return items.map((item) => this.response(item));
  }
  async findMine(user: string, pagination: PaginationDto = {}) {
    const establishment = await this.ds
      .getRepository(Establecimiento)
      .findOneBy({ usuarioId: user, estado: true });
    if (!establishment)
      throw new ForbiddenException('Necesitas un establecimiento activo.');
    const items = await this.query(true)
      .where('animal.establecimientoId = :id', { id: establishment.id })
      .orderBy('publication.createdAt', 'DESC')
      .addOrderBy('publication.id', 'ASC')
      .take(pagination.limit ?? 10)
      .skip(pagination.offset ?? 0)
      .getMany();
    return items.map((item) => this.response(item, true));
  }
  async findOne(id: string) {
    const item = await this.query()
      .where('publication.id = :id', { id })
      .andWhere('publication.estado = :state', {
        state: EstadoAdopcion.PUBLICADA,
      })
      .andWhere('animal.estado = :custody', {
        custody: EstadoResguardo.EN_RESGUARDO,
      })
      .andWhere('mascota.estado = true')
      .andWhere('establishment.estado = true')
      .andWhere('owner.estado = true')
      .getOne();
    if (!item) throw new NotFoundException('Publicacion no encontrada.');
    return this.response(item);
  }
  async update(user: string, id: string, dto: UpdatePublicacionAdopcionDto) {
    await this.ds.transaction(async (manager) => {
      const { publication } = await this.lockPublication(manager, user, id);
      if (dto.descripcion !== undefined)
        publication.descripcion = dto.descripcion;
      if (dto.requisitos !== undefined) publication.requisitos = dto.requisitos;
      await manager.save(PublicacionAdopcion, publication);
    });
    return this.findOwned(user, id);
  }
  async publish(user: string, id: string) {
    return this.changeState(
      user,
      id,
      EstadoAdopcion.RETIRADA,
      EstadoAdopcion.PUBLICADA,
    );
  }
  async withdraw(user: string, id: string) {
    return this.changeState(
      user,
      id,
      EstadoAdopcion.PUBLICADA,
      EstadoAdopcion.RETIRADA,
    );
  }
  async adopt(user: string, id: string, dto: RegistrarAdopcionDto) {
    await this.ds.transaction(async (manager) => {
      const { animal, publication } = await this.lockPublication(
        manager,
        user,
        id,
      );
      if (publication.estado !== EstadoAdopcion.PUBLICADA)
        throw new ConflictException('El estado actual no permite esta accion.');
      await manager.save(
        Adopcion,
        manager.create(Adopcion, {
          animalResguardadoId: animal.id,
          nombreAdoptante: dto.nombreAdoptante,
          telefonoAdoptante: dto.telefonoAdoptante,
          fechaAdopcion: dto.fechaAdopcion,
          observaciones: dto.observaciones || null,
        }),
      );
      publication.estado = EstadoAdopcion.ADOPTADA;
      publication.fechaAdopcion = new Date(
        `${dto.fechaAdopcion}T00:00:00.000Z`,
      );
      animal.estado = EstadoResguardo.ADOPTADO;
      await manager.save(AnimalResguardado, animal);
      await manager.save(PublicacionAdopcion, publication);
    });
    return this.findOwned(user, id);
  }
  private query(includeAdoption = false) {
    const query = this.publications
      .createQueryBuilder('publication')
      .innerJoinAndSelect('publication.animal', 'animal')
      .innerJoinAndSelect('animal.mascota', 'mascota')
      .leftJoinAndSelect('mascota.especie', 'especie')
      .leftJoinAndSelect('mascota.fotos', 'foto')
      .innerJoinAndSelect('animal.establecimiento', 'establishment')
      .innerJoin('establishment.usuario', 'owner');
    if (includeAdoption)
      query.leftJoinAndMapOne(
        'publication.registroAdopcion',
        Adopcion,
        'adoption',
        'adoption.animalResguardadoId = animal.id',
      );
    return query;
  }
  private response(item: PublicacionAdopcion, includeAdoption = false) {
    return {
      id: item.id,
      animalResguardadoId: item.animalResguardadoId,
      descripcion: item.descripcion,
      requisitos: item.requisitos,
      estado: item.estado,
      fechaAdopcion: item.fechaAdopcion,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      mascota: animalResponse(item.animal.mascota),
      establecimiento: establishmentResponse(item.animal.establecimiento),
      ...(includeAdoption
        ? {
            registroAdopcion: item.registroAdopcion
              ? {
                  id: item.registroAdopcion.id,
                  nombreAdoptante: item.registroAdopcion.nombreAdoptante,
                  telefonoAdoptante: item.registroAdopcion.telefonoAdoptante,
                  fechaAdopcion: item.registroAdopcion.fechaAdopcion,
                  observaciones: item.registroAdopcion.observaciones,
                  createdAt: item.registroAdopcion.createdAt,
                }
              : null,
          }
        : {}),
    };
  }
  private async findOwned(user: string, id: string) {
    const item = await this.query(true)
      .where('publication.id = :id', { id })
      .andWhere('establishment.usuarioId = :user', { user })
      .getOne();
    if (!item) throw new NotFoundException('Publicacion no encontrada.');
    return this.response(item, true);
  }
  private async lockAnimal(manager: EntityManager, user: string, id: string) {
    const establishment = await manager.findOne(Establecimiento, {
      where: { usuarioId: user, estado: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!establishment)
      throw new ForbiddenException('Necesitas un establecimiento activo.');
    const reference = await manager.findOneBy(AnimalResguardado, {
      id,
      establecimientoId: establishment.id,
    });
    if (!reference)
      throw new NotFoundException('Animal resguardado no encontrado.');
    const pet = await manager.findOne(Mascota, {
      where: { id: reference.mascotaId, usuarioId: user, estado: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pet) throw new NotFoundException('Animal resguardado no encontrado.');
    const animal = await manager.findOne(AnimalResguardado, {
      where: { id, establecimientoId: establishment.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!animal)
      throw new NotFoundException('Animal resguardado no encontrado.');
    if (animal.estado !== EstadoResguardo.EN_RESGUARDO)
      throw new ConflictException('El animal ya fue adoptado.');
    return animal;
  }
  private async lockPublication(
    manager: EntityManager,
    user: string,
    id: string,
  ) {
    const reference = await manager.findOneBy(PublicacionAdopcion, { id });
    if (!reference) throw new NotFoundException('Publicacion no encontrada.');
    const animal = await this.lockAnimal(
      manager,
      user,
      reference.animalResguardadoId,
    );
    const publication = await manager.findOne(PublicacionAdopcion, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!publication) throw new NotFoundException('Publicacion no encontrada.');
    if (publication.estado === EstadoAdopcion.ADOPTADA)
      throw new ConflictException('La adopcion ya fue registrada.');
    return { animal, publication };
  }
  private async changeState(
    user: string,
    id: string,
    from: EstadoAdopcion,
    to: EstadoAdopcion,
  ) {
    await this.ds.transaction(async (manager) => {
      const { publication } = await this.lockPublication(manager, user, id);
      if (publication.estado !== from)
        throw new ConflictException('El estado actual no permite esta accion.');
      publication.estado = to;
      await manager.save(PublicacionAdopcion, publication);
    });
    return this.findOwned(user, id);
  }
}
