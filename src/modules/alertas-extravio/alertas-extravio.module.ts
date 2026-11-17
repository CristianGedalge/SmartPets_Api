import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { AlertaExtravio } from './entities/alerta-extravio.entity';
import { AlertasExtravioController } from './alertas-extravio.controller';
import { AlertasExtravioService } from './alertas-extravio.service';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([AlertaExtravio, Mascota])],
  controllers: [AlertasExtravioController],
  providers: [AlertasExtravioService, OptionalJwtGuard],
})
export class AlertasExtravioModule {}
