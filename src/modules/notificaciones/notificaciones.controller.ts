import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { FcmTokenDto } from './dto/fcm-token.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
@AuthRole(RolNombre.CIUDADANO)
export class NotificacionesController {
  constructor(private readonly notifications: NotificacionesService) {}

  @Post('inicio-sesion')
  @HttpCode(HttpStatus.OK)
  notifyLogin(@Body() dto: FcmTokenDto) {
    return this.notifications.notifyLogin(dto.token);
  }

  @Post('cierre-sesion')
  @HttpCode(HttpStatus.OK)
  notifyLogout(@Body() dto: FcmTokenDto) {
    return this.notifications.notifyLogout(dto.token);
  }
}
