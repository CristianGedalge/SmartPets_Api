import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async findAll(paginationDto: PaginationDto = {}) {
    const { limit = 10, offset = 0 } = paginationDto;

    const usuarios = await this.usuarioRepo.find({
      take: limit,
      skip: offset,
      relations: { rol: true, establecimiento: true },
      order: { createdAt: 'DESC' },
    });

    return usuarios.map(({ passwordHash, ...usuario }) => ({
      ...usuario,
      rol: usuario.rol.nombre,
      establecimiento: usuario.establecimiento ?? null,
    }));
  }

  async findOne(id: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id },
      relations: { rol: true, establecimiento: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash, ...usuarioPublico } = usuario;

    return {
      ...usuarioPublico,
      rol: usuario.rol.nombre,
      establecimiento: usuario.establecimiento ?? null,
    };
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.usuarioRepo.preload({
      id,
      ...updateUsuarioDto,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const savedUsuario = await this.usuarioRepo.save(usuario);
    const { passwordHash, ...usuarioPublico } = savedUsuario;

    return usuarioPublico;
  }

  async remove(id: string) {
    const usuario = await this.usuarioRepo.preload({
      id,
      estado: false,
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const savedUsuario = await this.usuarioRepo.save(usuario);
    const { passwordHash, ...usuarioPublico } = savedUsuario;

    return usuarioPublico;
  }
}
