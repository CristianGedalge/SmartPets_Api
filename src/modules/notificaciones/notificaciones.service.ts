import { Injectable } from '@nestjs/common';
import { FirebaseMessagingService } from './firebase-messaging.service';

@Injectable()
export class NotificacionesService {
  constructor(private readonly messaging: FirebaseMessagingService) {}

  async notifyLogin(token: string) {
    const sent = await this.messaging.send(
      token,
      'Bienvenido a SmartPet',
      'Tu sesión se inició correctamente.',
      'INICIO_SESION',
    );
    return { enviado: sent };
  }

  async notifyLogout(token: string) {
    const sent = await this.messaging.send(
      token,
      'Sesión cerrada',
      'Cerraste tu sesión de SmartPet correctamente.',
      'CIERRE_SESION',
    );
    return { enviado: sent };
  }
}
