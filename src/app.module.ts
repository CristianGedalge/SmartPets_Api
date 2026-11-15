import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, jwtConfig } from './config';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EstablecimientosModule } from './modules/establecimientos/establecimientos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (dbConf: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        host: dbConf.host,
        port: dbConf.port,
        username: dbConf.username,
        password: dbConf.password,
        database: dbConf.name,
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    RolesModule,
    UsuariosModule,
    EstablecimientosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
