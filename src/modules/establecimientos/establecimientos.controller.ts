import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { UpdateEstablecimientoDto } from './dto/update-establecimiento.dto';
import { EstablecimientosService } from './establecimientos.service';

@Controller('establecimientos')
@AuthRole(RolNombre.ADMIN)
export class EstablecimientosController {
  constructor(
    private readonly establecimientosService: EstablecimientosService,
  ) {}

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.establecimientosService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.establecimientosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEstablecimientoDto: UpdateEstablecimientoDto,
  ) {
    return this.establecimientosService.update(id, updateEstablecimientoDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.establecimientosService.remove(id);
  }
}
