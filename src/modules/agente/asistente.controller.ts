import { Body, Controller, Ip, Post } from '@nestjs/common';
import { AgenteService } from './agente.service';
import { ChatAgenteDto } from './dto/chat-agente.dto';

@Controller('asistente')
export class AsistenteController {
  constructor(private readonly agente: AgenteService) {}

  @Post()
  chat(@Body() dto: ChatAgenteDto, @Ip() ip: string) {
    return this.agente.responderSitio(ip, dto);
  }
}
