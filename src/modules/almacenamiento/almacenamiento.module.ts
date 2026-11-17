import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from './cloudinary.service';
import { ArchivoPendiente } from './entities/archivo-pendiente.entity';
import { LimpiezaArchivosService } from './limpieza-archivos.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ArchivoPendiente])],
  providers: [CloudinaryService, LimpiezaArchivosService],
  exports: [CloudinaryService, LimpiezaArchivosService],
})
export class AlmacenamientoModule {}
