import type { FirebaseMessagingService } from './firebase-messaging.service';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  const token = 'fcm-token-123456789';
  const send = jest.fn().mockResolvedValue(true);
  const messaging = { send } as unknown as FirebaseMessagingService;
  const service = new NotificacionesService(messaging);

  beforeEach(() => {
    jest.clearAllMocks();
    send.mockResolvedValue(true);
  });

  it('envía la bienvenida directamente al token recibido', async () => {
    await expect(service.notifyLogin(token)).resolves.toEqual({
      enviado: true,
    });
    expect(send).toHaveBeenCalledWith(
      token,
      'Bienvenido a SmartPet',
      expect.any(String),
      'INICIO_SESION',
    );
  });

  it('envía el aviso de cierre directamente al token recibido', async () => {
    await expect(service.notifyLogout(token)).resolves.toEqual({
      enviado: true,
    });
    expect(send).toHaveBeenCalledWith(
      token,
      'Sesión cerrada',
      expect.any(String),
      'CIERRE_SESION',
    );
  });

  it('informa que no se envió cuando Firebase no está disponible', async () => {
    send.mockResolvedValue(false);
    await expect(service.notifyLogout(token)).resolves.toEqual({
      enviado: false,
    });
  });
});
