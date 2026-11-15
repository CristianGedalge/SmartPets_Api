import { Controller, Get } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from './entities/rol.entity';
import { RolesService } from './roles.service';

@Controller('roles')
@AuthRole(RolNombre.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
