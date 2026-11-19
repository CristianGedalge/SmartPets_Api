import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import {
  MAX_PHOTOS,
  photoUploadOptions,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { CreateMascotaDto } from './dto/create-mascota.dto';
import { UpdateMascotaDto } from './dto/update-mascota.dto';
import { AddFotosDto } from './dto/add-fotos.dto';
import { MascotasService } from './mascotas.service';

@Controller('mascotas')
@AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
export class MascotasController {
  constructor(private readonly mascotas: MascotasService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, photoUploadOptions))
  create(
    @GetUser('sub') usuarioId: string,
    @Body() dto: CreateMascotaDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    return this.mascotas.create(usuarioId, dto, files);
  }

  @Get()
  @AuthRole(RolNombre.ADMIN)
  findAllAdmin(@Query() pagination: PaginationDto) {
    return this.mascotas.findAllAdmin(pagination);
  }

  @Get('mis-mascotas')
  findAll(
    @GetUser('sub') usuarioId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.mascotas.findAll(usuarioId, pagination);
  }

  @Get(':id')
  findOne(
    @GetUser('sub') usuarioId: string,
    @GetUser('rol') rol: RolNombre,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mascotas.findOne(usuarioId, id, rol);
  }

  @Patch(':id')
  update(
    @GetUser('sub') usuarioId: string,
    @GetUser('rol') rol: RolNombre,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMascotaDto,
  ) {
    return this.mascotas.update(usuarioId, id, dto, rol);
  }

  @Delete(':id')
  remove(
    @GetUser('sub') usuarioId: string,
    @GetUser('rol') rol: RolNombre,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.mascotas.remove(usuarioId, id, rol);
  }

  @Post(':id/fotos')
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, photoUploadOptions))
  addPhotos(
    @GetUser('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: AddFotosDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    return this.mascotas.addPhotos(usuarioId, id, files);
  }

  @Delete(':id/fotos/:fotoId')
  removePhoto(
    @GetUser('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
  ) {
    return this.mascotas.removePhoto(usuarioId, id, fotoId);
  }
}
