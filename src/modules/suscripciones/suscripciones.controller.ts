import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { AsignarSuscripcionDto } from './dto/asignar-suscripcion.dto';
import { SuscripcionesService } from './suscripciones.service';

@Controller('suscripciones')
@AuthRole(RolNombre.ADMIN)
export class SuscripcionesController {
  constructor(private readonly suscripciones: SuscripcionesService) {}

  @Get('usuarios/:usuarioId')
  deCiudadano(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.suscripciones.deCiudadano(usuarioId);
  }

  @Put('usuarios/:usuarioId')
  asignar(
    @GetUser('sub') adminId: string,
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: AsignarSuscripcionDto,
  ) {
    return this.suscripciones.asignar(adminId, usuarioId, dto);
  }
}
