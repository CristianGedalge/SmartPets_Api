import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolNombre } from '../../roles/entities/rol.entity';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export function AuthRole(...roles: RolNombre[]) {
  return applyDecorators(
    Roles(...roles),
    UseGuards(AuthGuard('jwt'), RolesGuard),
  );
}
