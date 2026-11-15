import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';
import { Establecimiento } from './entities/establecimiento.entity';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepo: Repository<Establecimiento>,
  ) {}

  async findAll(paginationDto: PaginationDto = {}) {
    const { limit = 10, offset = 0 } = paginationDto;

    const establecimientos = await this.establecimientoRepo.find({
      take: limit,
      skip: offset,
      relations: { usuario: { rol: true } },
      order: { createdAt: 'DESC' },
    });

    return establecimientos.map((establecimiento) => {
      if (!establecimiento.usuario) {
        return { ...establecimiento, usuario: null };
      }
      const { passwordHash, ...usuarioPublico } = establecimiento.usuario;
      return {
        ...establecimiento,
        usuario: {
          ...usuarioPublico,
          rol: establecimiento.usuario.rol?.nombre,
        },
      };
    });
  }

  async findOne(id: string) {
    const establecimiento = await this.establecimientoRepo.findOne({
      where: { id },
      relations: { usuario: { rol: true } },
    });

    if (!establecimiento) {
      throw new NotFoundException('Establecimiento no encontrado');
    }

    if (!establecimiento.usuario) {
      return { ...establecimiento, usuario: null };
    }

    const { passwordHash, ...usuarioPublico } = establecimiento.usuario;

    return {
      ...establecimiento,
      usuario: {
        ...usuarioPublico,
        rol: establecimiento.usuario.rol?.nombre,
      },
    };
  }

  async update(id: string, updateEstablecimientoDto: UpdateEstablecimientoDto) {
    const establecimiento = await this.establecimientoRepo.preload({
      id,
      ...updateEstablecimientoDto,
    });

    if (!establecimiento) {
      throw new NotFoundException('Establecimiento no encontrado');
    }

    return this.establecimientoRepo.save(establecimiento);
  }

  async remove(id: string) {
    const establecimiento = await this.establecimientoRepo.preload({
      id,
      estado: false,
    });

    if (!establecimiento) {
      throw new NotFoundException('Establecimiento no encontrado');
    }

    return this.establecimientoRepo.save(establecimiento);
  }
}
