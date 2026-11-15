import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import { EstablecimientosController } from './establecimientos.controller';
import { EstablecimientosService } from './establecimientos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento])],
  controllers: [EstablecimientosController],
  providers: [EstablecimientosService],
  exports: [TypeOrmModule],
})
export class EstablecimientosModule {}
