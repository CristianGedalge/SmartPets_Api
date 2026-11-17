import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RolNombre } from '../roles/entities/rol.entity';
import { CreateAlertaExtravioDto } from './dto/create-alerta-extravio.dto';
import { UpdateAlertaExtravioDto } from './dto/update-alerta-extravio.dto';
import { CambioEstadoAlertaDto } from './dto/cambio-estado-alerta.dto';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { AlertasExtravioService } from './alertas-extravio.service';

@Controller('alertas-extravio')
export class AlertasExtravioController {
  constructor(private readonly alertas: AlertasExtravioService) {}

  @Post()
  @AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
  create(
    @GetUser('sub') usuarioId: string,
    @Body() dto: CreateAlertaExtravioDto,
  ) {
    return this.alertas.create(usuarioId, dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.alertas.findAll(pagination);
  }

  @Get('mis-alertas')
  @AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
  findMine(
    @GetUser('sub') usuarioId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.alertas.findMine(usuarioId, pagination);
  }

  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: JwtPayload },
  ) {
    return this.alertas.findOne(id, request.user?.sub);
  }

  @Patch(':id')
  @AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
  update(
    @GetUser('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertaExtravioDto,
  ) {
    return this.alertas.update(usuarioId, id, dto);
  }

  @Patch(':id/resolver')
  @AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
  resolve(
    @GetUser('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: CambioEstadoAlertaDto,
  ) {
    void _dto;
    return this.alertas.resolve(usuarioId, id);
  }

  @Patch(':id/cancelar')
  @AuthRole(RolNombre.ADMIN, RolNombre.CIUDADANO, RolNombre.ENCARGADO)
  cancel(
    @GetUser('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: CambioEstadoAlertaDto,
  ) {
    void _dto;
    return this.alertas.cancel(usuarioId, id);
  }
}
