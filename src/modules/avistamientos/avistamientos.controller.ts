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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolNombre } from '../roles/entities/rol.entity';
import { OptionalJwtGuard } from '../alertas-extravio/guards/optional-jwt.guard';
import {
  MAX_PHOTOS,
  photoUploadOptions,
  type ImageUpload,
} from '../almacenamiento/image-upload';
import { CreateAvistamientoDto } from './dto/create-avistamiento.dto';
import { UpdateAvistamientoDto } from './dto/update-avistamiento.dto';
import { AvistamientoActionDto } from './dto/avistamiento-action.dto';
import { AvistamientosService } from './avistamientos.service';
const roles = [RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO];
const uploadOptions = {
  ...photoUploadOptions,
  limits: { ...photoUploadOptions.limits, fieldSize: 8192 },
};
@Controller('avistamientos')
export class AvistamientosController {
  constructor(private readonly avistamientos: AvistamientosService) {}
  @Post()
  @AuthRole(...roles)
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, uploadOptions))
  create(
    @GetUser('sub') user: string,
    @Body() dto: CreateAvistamientoDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    return this.avistamientos.create(user, dto, files);
  }
  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.avistamientos.findAll(pagination);
  }
  @Get('mis-avistamientos')
  @AuthRole(...roles)
  findMine(@GetUser('sub') user: string, @Query() pagination: PaginationDto) {
    return this.avistamientos.findMine(user, pagination);
  }
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: JwtPayload },
  ) {
    return this.avistamientos.findOne(id, request.user?.sub);
  }
  @Patch(':id')
  @AuthRole(...roles)
  update(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvistamientoDto,
  ) {
    return this.avistamientos.update(user, id, dto);
  }
  @Patch(':id/cerrar')
  @AuthRole(...roles)
  close(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AvistamientoActionDto,
  ) {
    void dto;
    return this.avistamientos.close(user, id);
  }
  @Patch(':id/cancelar')
  @AuthRole(...roles)
  cancel(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AvistamientoActionDto,
  ) {
    void dto;
    return this.avistamientos.cancel(user, id);
  }
  @Post(':id/fotos')
  @AuthRole(...roles)
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS, uploadOptions))
  addPhotos(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AvistamientoActionDto,
    @UploadedFiles() files?: ImageUpload[],
  ) {
    void dto;
    return this.avistamientos.addPhotos(user, id, files);
  }
  @Delete(':id/fotos/:fotoId')
  @AuthRole(...roles)
  removePhoto(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fotoId', ParseUUIDPipe) fotoId: string,
  ) {
    return this.avistamientos.removePhoto(user, id, fotoId);
  }
}
