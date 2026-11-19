import { Body, Controller, Post } from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { AgenteService } from './agente.service';
import { ChatAgenteDto } from './dto/chat-agente.dto';

@Controller('agente')
@AuthRole(RolNombre.CIUDADANO)
export class AgenteController {
  constructor(private readonly agente: AgenteService) {}

  @Post('chat')
  chat(@GetUser('sub') usuarioId: string, @Body() dto: ChatAgenteDto) {
    return this.agente.responder(usuarioId, dto);
  }
}
