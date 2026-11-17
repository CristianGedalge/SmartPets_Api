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
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import {
  MAX_PHOTOS,
  photoUploadOptions,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { CreateMascotaDto } from '../mascotas/dto/create-mascota.dto';
import { UpdateMascotaDto } from '../mascotas/dto/update-mascota.dto';
import { AddFotosDto } from '../mascotas/dto/add-fotos.dto';
import { ResguardoService } from './resguardo.service';
@Controller('animales-resguardados')
@AuthRole(RolNombre.ENCARGADO)
export class ResguardoController {
  constructor(private readonly animals: ResguardoService) {}
  @Post()
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, photoUploadOptions))
  create(
    @GetUser('sub') user: string,
    @Body() dto: CreateMascotaDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    return this.animals.create(user, dto, files);
  }
  @Get() findAll(@GetUser('sub') user: string, @Query() query: PaginationDto) {
    return this.animals.findAll(user, query);
  }
  @Get(':id') findOne(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.animals.findOne(user, id);
  }
  @Patch(':id') update(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMascotaDto,
  ) {
    return this.animals.update(user, id, dto);
  }
  @Post(':id/fotos')
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, photoUploadOptions))
  addPhotos(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddFotosDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    void dto;
    return this.animals.addPhotos(user, id, files);
  }
  @Delete(':id/fotos/:fotoId') removePhoto(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) photo: string,
  ) {
    return this.animals.removePhoto(user, id, photo);
  }
}
