import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { SuscripcionesService } from './suscripciones.service';

@Controller('suscripciones')
@AuthRole(RolNombre.ADMIN)
export class SuscripcionesController {
  constructor(private readonly suscripciones: SuscripcionesService) {}

  @Get('usuarios/:usuarioId')
  deCiudadano(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.suscripciones.deCiudadano(usuarioId);
  }
}
