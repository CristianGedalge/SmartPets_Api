import { Module } from '@nestjs/common';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module';
import { AgenteController } from './agente.controller';
import { AgenteService } from './agente.service';
import { AsistenteController } from './asistente.controller';

@Module({
  imports: [SuscripcionesModule],
  controllers: [AgenteController, AsistenteController],
  providers: [AgenteService],
})
export class AgenteModule {}
