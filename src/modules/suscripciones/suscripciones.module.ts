import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Consumo } from './entities/consumo.entity';
import { Pago } from './entities/pago.entity';
import { Plan } from './entities/plan.entity';
import { Suscripcion } from './entities/suscripcion.entity';
import { PagosController } from './pagos.controller';
import { PlanesController } from './planes.controller';
import { SuscripcionesController } from './suscripciones.controller';
import { SuscripcionesService } from './suscripciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Suscripcion, Consumo, Pago, Usuario]),
  ],
  controllers: [PlanesController, SuscripcionesController, PagosController],
  providers: [SuscripcionesService],
  exports: [SuscripcionesService],
})
export class SuscripcionesModule {}
