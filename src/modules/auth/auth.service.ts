import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Rol, RolNombre } from '../roles/entities/rol.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AceptacionLegal } from './entities/aceptacion-legal.entity';
import { LEGAL_VERSION } from './legal/legal-version';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly suscripciones: SuscripcionesService,
  ) {}

  async register(registerDto: RegisterDto) {
    if (
      registerDto.aceptaTerminos !== true ||
      registerDto.aceptaPrivacidad !== true ||
      registerDto.versionLegal !== LEGAL_VERSION
    ) {
      throw new BadRequestException(
        'Debes aceptar los términos y la política de privacidad vigentes para registrarte.',
      );
    }
    const {
      aceptaTerminos,
      aceptaPrivacidad,
      versionLegal,
      password,
      establecimiento: establecimientoDto,
      ...usuarioData
    } = registerDto;

    const existingUser = await this.usuarioRepo.findOne({
      where: { email: usuarioData.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const rolNombre = establecimientoDto
      ? RolNombre.ENCARGADO
      : RolNombre.CIUDADANO;

    const rol = await this.rolRepo.findOne({
      where: { nombre: rolNombre },
    });
    if (!rol) {
      throw new InternalServerErrorException(`Rol ${rolNombre} no configurado`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { usuario, establecimiento } = await this.dataSource.transaction(
      async (manager) => {
        const newUsuario = manager.create(Usuario, {
          ...usuarioData,
          rolId: rol.id,
          passwordHash,
          estado: true,
        });
        const savedUsuario = await manager.save(Usuario, newUsuario);

        let savedEstablecimiento: Establecimiento | null = null;
        if (establecimientoDto) {
          const newEstablecimiento = manager.create(Establecimiento, {
            ...establecimientoDto,
            usuarioId: savedUsuario.id,
            estado: true,
          });
          savedEstablecimiento = await manager.save(
            Establecimiento,
            newEstablecimiento,
          );
        }

        await manager.insert(AceptacionLegal, {
          usuarioId: savedUsuario.id,
          versionTerminos: versionLegal,
          versionPrivacidad: versionLegal,
        });
        if (rolNombre === RolNombre.CIUDADANO) {
          await this.suscripciones.asignarGratis(manager, savedUsuario.id);
        }

        return { usuario: savedUsuario, establecimiento: savedEstablecimiento };
      },
    );

    const access_token = await this.getJwtToken({
      sub: usuario.id,
      email: usuario.email,
      rol: rol.nombre,
    });

    const { passwordHash: _, ...usuarioPublico } = usuario;

    return {
      access_token,
      usuario: {
        ...usuarioPublico,
        rol: rol.nombre,
        establecimiento,
        suscripcion: await this.suscripciones.resumen(usuario.id),
      },
    };
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: loginDto.email },
      relations: { rol: true, establecimiento: true },
    });

    if (!usuario || !usuario.estado) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      usuario.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const access_token = await this.getJwtToken({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
    });

    const { passwordHash, ...usuarioPublico } = usuario;

    return {
      access_token,
      usuario: {
        ...usuarioPublico,
        rol: usuario.rol.nombre,
        establecimiento: usuario.establecimiento ?? null,
        suscripcion: await this.suscripciones.resumen(usuario.id),
      },
    };
  }

  async getProfile(userId: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: userId },
      relations: { rol: true, establecimiento: true },
    });

    if (!usuario || !usuario.estado) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    const { passwordHash, ...usuarioPublico } = usuario;

    return {
      ...usuarioPublico,
      rol: usuario.rol.nombre,
      establecimiento: usuario.establecimiento ?? null,
      suscripcion: await this.suscripciones.resumen(usuario.id),
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const {
      password,
      establecimiento: establecimientoDto,
      ...usuarioDto
    } = updateProfileDto;

    await this.dataSource.transaction(async (manager) => {
      const preloadedUsuario = await manager.preload(Usuario, {
        id: userId,
        ...usuarioDto,
        ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
      });

      if (!preloadedUsuario || !preloadedUsuario.estado) {
        throw new UnauthorizedException('Usuario no autorizado');
      }

      await manager.save(Usuario, preloadedUsuario);

      if (establecimientoDto) {
        const existingEst = await manager.findOne(Establecimiento, {
          where: { usuarioId: userId },
        });
        if (existingEst) {
          const preloadedEst = await manager.preload(Establecimiento, {
            id: existingEst.id,
            ...establecimientoDto,
          });
          if (preloadedEst) {
            await manager.save(Establecimiento, preloadedEst);
          }
        }
      }
    });

    return this.getProfile(userId);
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload);
  }
}
