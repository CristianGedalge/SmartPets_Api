import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';
import { Especie } from '../especies/entities/especie.entity';
import { Mascota } from './entities/mascota.entity';
import { FotoMascota } from './entities/foto-mascota.entity';
import { MascotasController } from './mascotas.controller';
import { MascotasService } from './mascotas.service';

@Module({
  imports: [
    AuthModule,
    AlmacenamientoModule,
    TypeOrmModule.forFeature([Mascota, FotoMascota, Especie]),
  ],
  controllers: [MascotasController],
  providers: [MascotasService],
  exports: [MascotasService],
})
export class MascotasModule {}
