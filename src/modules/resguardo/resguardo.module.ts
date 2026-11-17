import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MascotasModule } from '../mascotas/mascotas.module';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { AnimalResguardado } from './entities/animal-resguardado.entity';
import { ResguardoService } from './resguardo.service';
import { ResguardoController } from './resguardo.controller';
@Module({
  imports: [
    AuthModule,
    MascotasModule,
    TypeOrmModule.forFeature([
      AnimalResguardado,
      Establecimiento,
      PublicacionAdopcion,
    ]),
  ],
  controllers: [ResguardoController],
  providers: [ResguardoService],
})
export class ResguardoModule {}
