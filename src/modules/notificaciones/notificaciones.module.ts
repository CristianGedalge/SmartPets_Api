import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseMessagingService } from './firebase-messaging.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, FirebaseMessagingService],
})
export class NotificacionesModule {}
