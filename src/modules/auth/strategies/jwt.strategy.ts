import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { jwtConfig } from '../../../config';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    jwtConf: ConfigType<typeof jwtConfig>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConf.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub },
      relations: { rol: true },
    });

    if (!usuario || !usuario.estado) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    return {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
    };
  }
}
