import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { jwtConfig } from '../../config';
import { EstablecimientosModule } from '../establecimientos/establecimientos.module';
import { RolesModule } from '../roles/roles.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    RolesModule,
    UsuariosModule,
    EstablecimientosModule,
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
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard, PassportModule],
})
export class AuthModule {}
