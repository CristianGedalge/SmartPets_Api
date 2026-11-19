import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FotoAvistamiento } from '../avistamientos/entities/foto-avistamiento.entity';
import { Especie } from '../especies/entities/especie.entity';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { BusquedaVisualController } from './busqueda-visual.controller';
import { BusquedaVisualService } from './busqueda-visual.service';
import { AvistamientoEmbedding } from './entities/avistamiento-embedding.entity';
import { SightingPhotoClient } from './sighting-photo.client';
import { VisualModelClient } from './visual-model.client';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      FotoAvistamiento,
      AvistamientoEmbedding,
      Especie,
      Avistamiento,
    ]),
  ],
  controllers: [BusquedaVisualController],
  providers: [BusquedaVisualService, VisualModelClient, SightingPhotoClient],
})
export class BusquedaVisualModule {}
