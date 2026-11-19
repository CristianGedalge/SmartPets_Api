import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { SuscripcionesService } from './suscripciones.service';

@Controller('planes')
@AuthRole(RolNombre.ADMIN)
export class PlanesController {
  constructor(private readonly suscripciones: SuscripcionesService) {}

  @Get()
  listar() {
    return this.suscripciones.listarPlanes();
  }

  @Post()
  crear(@Body() dto: CreatePlanDto) {
    return this.suscripciones.crearPlan(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.suscripciones.actualizarPlan(id, dto);
  }
}
