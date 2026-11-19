import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AceptacionLegal } from './entities/aceptacion-legal.entity';
import { VerificacionEmail } from './entities/verificacion-email.entity';
import type { ConfigType } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../config';
import { EstablecimientosModule } from '../establecimientos/establecimientos.module';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';
import { RolesModule } from '../roles/roles.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEmailService } from './auth-email.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([AceptacionLegal, VerificacionEmail]),
    RolesModule,
    UsuariosModule,
    EstablecimientosModule,
    SuscripcionesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (jwtConf: ConfigType<typeof jwtConfig>) => ({
        secret: jwtConf.secret,
        signOptions: {
          expiresIn: jwtConf.expiresIn as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthEmailService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard, PassportModule],
})
export class AuthModule {}
