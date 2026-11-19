import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import {
  MAX_PHOTOS,
  photoUploadOptions,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { BuscarAvistamientosDto } from './dto/buscar-avistamientos.dto';
import { BusquedaVisualService } from './busqueda-visual.service';

@Controller('busqueda-visual')
export class BusquedaVisualController {
  constructor(private readonly service: BusquedaVisualService) {}
  @Post('avistamientos')
  @AuthRole(RolNombre.CIUDADANO)
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, photoUploadOptions))
  buscar(
    @GetUser('sub') usuarioId: string,
    @Body() dto: BuscarAvistamientosDto,
    @UploadedFiles() photos?: ImageUpload[],
  ) {
    return this.service.buscar(usuarioId, dto, photos);
  }
}
