import { Controller, Get, Query } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { AnaliticaService } from './analitica.service';
import { MapaCalorDto } from './dto/mapa-calor.dto';

@Controller('analitica')
@AuthRole(RolNombre.ADMIN, RolNombre.ENCARGADO)
export class AnaliticaController {
  constructor(private readonly analitica: AnaliticaService) {}

  @Get('mapa-calor')
  mapaCalor(@Query() dto: MapaCalorDto) {
    return this.analitica.mapaCalor(dto);
  }
}
