import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversacion } from './entities/conversacion.entity';
import { ParticipanteConversacion } from './entities/participante-conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversacion, ParticipanteConversacion, Mensaje]),
  ],
})
export class ChatModule {}
