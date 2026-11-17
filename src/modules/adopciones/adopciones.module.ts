import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PublicacionAdopcion } from './entities/publicacion-adopcion.entity';
import { AdopcionesService } from './adopciones.service';
import { AdopcionesController } from './adopciones.controller';
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([PublicacionAdopcion])],
  controllers: [AdopcionesController],
  providers: [AdopcionesService],
})
export class AdopcionesModule {}
