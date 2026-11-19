import { ResguardoModule } from './modules/resguardo/resguardo.module';
import { AdopcionesModule } from './modules/adopciones/adopciones.module';
import { ChatModule } from './modules/chat/chat.module';
import { AnaliticaModule } from './modules/analitica/analitica.module';
import { BusquedaVisualModule } from './modules/busqueda-visual/busqueda-visual.module';
import { ContactoModule } from './modules/contacto/contacto.module';
import { AgenteModule } from './modules/agente/agente.module';
import { SuscripcionesModule } from './modules/suscripciones/suscripciones.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';
import {
  cloudinaryConfig,
  databaseConfig,
  jwtConfig,
  iaConfig,
  contactConfig,
  bedrockConfig,
} from './config';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { EstablecimientosModule } from './modules/establecimientos/establecimientos.module';
import { EspeciesModule } from './modules/especies/especies.module';
import { MascotasModule } from './modules/mascotas/mascotas.module';
import { AvistamientosModule } from './modules/avistamientos/avistamientos.module';
import { AlertasExtravioModule } from './modules/alertas-extravio/alertas-extravio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        cloudinaryConfig,
        iaConfig,
        contactConfig,
        bedrockConfig,
      ],
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
    EspeciesModule,
    MascotasModule,
    AlertasExtravioModule,
    AvistamientosModule,
    ResguardoModule,
    AdopcionesModule,
    ChatModule,
    AnaliticaModule,
    BusquedaVisualModule,
    ContactoModule,
    AgenteModule,
    SuscripcionesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class AppModule {}
