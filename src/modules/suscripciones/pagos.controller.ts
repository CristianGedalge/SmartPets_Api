import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { SuscripcionesService } from './suscripciones.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly suscripciones: SuscripcionesService) {}

  @Get('planes/publicos')
  planesPublicos() {
    return this.suscripciones.listarDisponibles();
  }

  @Get('planes')
  @AuthRole(RolNombre.CIUDADANO)
  planes() {
    return this.suscripciones.listarDisponibles();
  }

  @Post()
  @AuthRole(RolNombre.CIUDADANO)
  pagar(@GetUser('sub') usuarioId: string, @Body() dto: CrearPagoDto) {
    return this.suscripciones.pagar(usuarioId, dto);
  }
}
