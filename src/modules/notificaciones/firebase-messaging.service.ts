import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { cert, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { firebaseConfig } from '../../config';

@Injectable()
export class FirebaseMessagingService implements OnModuleDestroy {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private readonly app?: App;

  constructor(
    @Inject(firebaseConfig.KEY)
    config: ConfigType<typeof firebaseConfig>,
  ) {
    if (!config.enabled) return;
    this.app = initializeApp(
      {
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      },
      'smartpet-push',
    );
  }

  async send(token: string, title: string, body: string, event: string) {
    if (!this.app) return false;
    try {
      await getMessaging(this.app).send({
        fid: token,
        notification: { title, body },
        data: { evento: event },
        android: {
          priority: 'high',
          notification: { channelId: 'smartpet_session' },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.warn(`No se pudo enviar una notificación: ${message}`);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.app) await deleteApp(this.app);
  }
}
