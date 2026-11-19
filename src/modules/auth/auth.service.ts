import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
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
import { VerificacionEmail } from './entities/verificacion-email.entity';
import { AuthEmailService } from './auth-email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(VerificacionEmail)
    private readonly verificacionRepo: Repository<VerificacionEmail>,
    @InjectRepository(AceptacionLegal)
    private readonly aceptacionRepo: Repository<AceptacionLegal>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly suscripciones: SuscripcionesService,
    private readonly authEmail: AuthEmailService,
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
          emailVerificado: rolNombre !== RolNombre.CIUDADANO,
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

    if (rolNombre === RolNombre.CIUDADANO) {
      return this.preparePendingVerification(usuario, true);
    }

    return this.createSession(usuario, rol.nombre, establecimiento);
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

    if (
      this.isCitizenRole(usuario.rol.nombre) &&
      usuario.emailVerificado === false
    ) {
      return this.preparePendingVerification(usuario, false);
    }

    return this.createSession(
      usuario,
      usuario.rol.nombre,
      usuario.establecimiento ?? null,
    );
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email },
      relations: { rol: true, establecimiento: true },
    });
    if (
      !usuario ||
      !usuario.estado ||
      !this.isCitizenRole(usuario.rol.nombre) ||
      usuario.emailVerificado
    ) {
      throw new BadRequestException(
        'El código no es válido o ya fue utilizado.',
      );
    }

    const verification = await this.verificacionRepo.findOne({
      where: { usuarioId: usuario.id },
    });
    if (!verification || verification.expiraEn.getTime() <= Date.now()) {
      if (verification) await this.verificacionRepo.delete(usuario.id);
      throw new BadRequestException(
        'El código venció. Solicita uno nuevo para continuar.',
      );
    }
    if (verification.intentos >= MAX_CODE_ATTEMPTS) {
      throw new HttpException(
        'Superaste los intentos permitidos. Solicita un código nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.matchesCode(dto.codigo, verification)) {
      verification.intentos += 1;
      await this.verificacionRepo.save(verification);
      if (verification.intentos >= MAX_CODE_ATTEMPTS) {
        throw new HttpException(
          'Superaste los intentos permitidos. Solicita un código nuevo.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('El código ingresado no es correcto.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        Usuario,
        { id: usuario.id },
        { emailVerificado: true },
      );
      await manager.delete(VerificacionEmail, { usuarioId: usuario.id });
    });
    usuario.emailVerificado = true;

    const acceptance = await this.aceptacionRepo.findOne({
      where: { usuarioId: usuario.id },
    });
    await this.authEmail.sendWelcome(
      usuario.email,
      usuario.nombre,
      acceptance?.versionTerminos ?? LEGAL_VERSION,
    );

    return this.createSession(
      usuario,
      usuario.rol.nombre,
      usuario.establecimiento ?? null,
    );
  }

  async resendVerification(dto: ResendVerificationDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email },
      relations: { rol: true },
    });
    if (
      !usuario ||
      !usuario.estado ||
      usuario.emailVerificado ||
      !this.isCitizenRole(usuario.rol.nombre)
    ) {
      return { enviado: true };
    }
    const result = await this.preparePendingVerification(usuario, true);
    return { enviado: result.correoEnviado };
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

  private async createSession(
    usuario: Usuario,
    rol: string,
    establecimiento: Establecimiento | null,
  ) {
    const access_token = await this.getJwtToken({
      sub: usuario.id,
      email: usuario.email,
      rol,
    });
    const { passwordHash: _, ...usuarioPublico } = usuario;
    return {
      access_token,
      usuario: {
        ...usuarioPublico,
        rol,
        establecimiento,
        suscripcion: await this.suscripciones.resumen(usuario.id),
      },
    };
  }

  private async preparePendingVerification(
    usuario: Usuario,
    forceNew: boolean,
  ) {
    const existing = await this.verificacionRepo.findOne({
      where: { usuarioId: usuario.id },
    });
    const now = Date.now();
    if (existing && existing.expiraEn.getTime() > now) {
      const elapsed = now - existing.enviadoEn.getTime();
      if (forceNew && elapsed < RESEND_COOLDOWN_MS) {
        const seconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException(
          `Espera ${seconds} segundos antes de solicitar otro código.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (!forceNew) return this.pendingResponse(usuario.email, true);
    }

    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const salt = randomBytes(16).toString('hex');
    const verification = this.verificacionRepo.create({
      usuarioId: usuario.id,
      codigoHash: this.hashCode(codigo, salt),
      salt,
      expiraEn: new Date(now + CODE_TTL_MS),
      intentos: 0,
      enviadoEn: new Date(now),
    });
    await this.verificacionRepo.save(verification);
    const correoEnviado = await this.authEmail.sendVerification(
      usuario.email,
      usuario.nombre,
      codigo,
    );
    if (!correoEnviado) await this.verificacionRepo.delete(usuario.id);
    return this.pendingResponse(usuario.email, correoEnviado);
  }

  private pendingResponse(email: string, correoEnviado: boolean) {
    const [local, domain] = email.split('@');
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
    return {
      requiereVerificacion: true,
      email,
      emailEnmascarado: `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`,
      correoEnviado,
    };
  }

  private hashCode(code: string, salt: string) {
    return scryptSync(code, salt, 64).toString('hex');
  }

  private isCitizenRole(role: string) {
    return role === 'CIUDADANO';
  }

  private matchesCode(code: string, verification: VerificacionEmail) {
    const received = Buffer.from(this.hashCode(code, verification.salt), 'hex');
    const expected = Buffer.from(verification.codigoHash, 'hex');
    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }
}
