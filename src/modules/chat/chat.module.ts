import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversacion } from './entities/conversacion.entity';
import { ParticipanteConversacion } from './entities/participante-conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatEvents } from './chat.events';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Conversacion, ParticipanteConversacion, Mensaje]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatEvents, ChatGateway],
})
export class ChatModule {}
