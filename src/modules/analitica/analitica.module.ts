import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AlertaExtravio } from '../alertas-extravio/entities/alerta-extravio.entity';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AlertaExtravio, Avistamiento]),
  ],
  controllers: [AnaliticaController],
  providers: [AnaliticaService],
})
export class AnaliticaModule {}
