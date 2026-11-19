import { Body, Controller, Ip, Post } from '@nestjs/common';
import { ContactoService } from './contacto.service';
import { EnviarContactoDto } from './dto/enviar-contacto.dto';

@Controller('contacto')
export class ContactoController {
  constructor(private readonly contactoService: ContactoService) {}

  @Post()
  enviar(@Body() dto: EnviarContactoDto, @Ip() ip: string) {
    return this.contactoService.enviar(dto, ip);
  }
}
