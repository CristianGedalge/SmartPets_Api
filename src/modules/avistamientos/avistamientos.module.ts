import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';
import { Especie } from '../especies/entities/especie.entity';
import { Avistamiento } from './entities/avistamiento.entity';
import { FotoAvistamiento } from './entities/foto-avistamiento.entity';
import { AvistamientosController } from './avistamientos.controller';
import { OptionalJwtGuard } from '../alertas-extravio/guards/optional-jwt.guard';
import { AvistamientosService } from './avistamientos.service';

@Module({
  imports: [
    AuthModule,
    AlmacenamientoModule,
    TypeOrmModule.forFeature([Avistamiento, FotoAvistamiento, Especie]),
  ],
  controllers: [AvistamientosController],
  providers: [AvistamientosService, OptionalJwtGuard],
})
export class AvistamientosModule {}
