import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthRole } from '../auth/decorators/auth-role.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { RolNombre } from '../roles/entities/rol.entity';
import { ChatService } from './chat.service';
import {
  ChatPaginationDto,
  CreateConversacionDto,
  MensajesQueryDto,
  ReadChatDto,
  SendMensajeDto,
} from './dto/chat.dto';
@Controller('chat/conversaciones')
@AuthRole(RolNombre.ADMIN, RolNombre.ENCARGADO, RolNombre.CIUDADANO)
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  @Post() create(
    @GetUser('sub') user: string,
    @Body() dto: CreateConversacionDto,
  ) {
    return this.chat.create(user, dto);
  }
  @Get() findAll(
    @GetUser('sub') user: string,
    @Query() query: ChatPaginationDto,
  ) {
    return this.chat.findAll(user, query);
  }
  @Get(':id') findOne(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.chat.findOne(user, id);
  }
  @Get(':id/mensajes') messages(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MensajesQueryDto,
  ) {
    return this.chat.findMessages(user, id, query);
  }
  @Post(':id/mensajes') send(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMensajeDto,
  ) {
    return this.chat.send(user, id, dto);
  }
  @Patch(':id/lectura') read(
    @GetUser('sub') user: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReadChatDto,
  ) {
    return this.chat.markRead(user, id, dto.mensajeId);
  }
}
