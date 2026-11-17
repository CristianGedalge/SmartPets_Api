import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import {
  CreatePublicacionAdopcionDto,
  UpdatePublicacionAdopcionDto,
  AdopcionActionDto,
} from './dto/publicacion-adopcion.dto';
import { AdopcionesService } from './adopciones.service';
@Controller('adopciones')
export class AdopcionesController {
  constructor(private readonly adoptions: AdopcionesService) {}
  @Post()
  @AuthRole(RolNombre.ENCARGADO)
  create(
    @GetUser('sub') user: string,
    @Body() dto: CreatePublicacionAdopcionDto,
  ) {
    return this.adoptions.create(user, dto);
  }
  @Get() findAll(@Query() query: PaginationDto) {
    return this.adoptions.findAll(query);
  }
  @Get('mis-publicaciones')
  @AuthRole(RolNombre.ENCARGADO)
  findMine(@GetUser('sub') user: string, @Query() query: PaginationDto) {
    return this.adoptions.findMine(user, query);
  }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.adoptions.findOne(id);
  }
  @Patch(':id')
  @AuthRole(RolNombre.ENCARGADO)
  update(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePublicacionAdopcionDto,
  ) {
    return this.adoptions.update(user, id, dto);
  }
  @Patch(':id/publicar')
  @AuthRole(RolNombre.ENCARGADO)
  publish(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdopcionActionDto,
  ) {
    void dto;
    return this.adoptions.publish(user, id);
  }
  @Patch(':id/retirar')
  @AuthRole(RolNombre.ENCARGADO)
  withdraw(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdopcionActionDto,
  ) {
    void dto;
    return this.adoptions.withdraw(user, id);
  }
  @Patch(':id/adoptar')
  @AuthRole(RolNombre.ENCARGADO)
  adopt(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdopcionActionDto,
  ) {
    void dto;
    return this.adoptions.adopt(user, id);
  }
}
