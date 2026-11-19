import { ServiceUnavailableException } from '@nestjs/common';
import { ContactoService } from './contacto.service';

const dto = {
  nombre: 'Ana Pérez',
  email: 'ana@example.com',
  asunto: 'Consulta de adopción',
  mensaje: '<script>alert(1)</script> Quiero conocer más información.',
};

const enabledConfig = {
  enabled: true,
  apiKey: 'test-key',
  senderEmail: 'sender@example.com',
  senderName: 'SmartPet',
  recipientEmail: 'admin@example.com',
};

describe('ContactoService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envía al administrador, configura replyTo y escapa el HTML', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));
    const service = new ContactoService(enabledConfig);

    await expect(service.enviar(dto, '127.0.0.1')).resolves.toEqual({
      enviado: true,
    });

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('https://api.brevo.com/v3/smtp/email');
    const rawBody = request[1]?.body;
    expect(typeof rawBody).toBe('string');
    const body = JSON.parse(rawBody as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      to: [{ email: 'admin@example.com' }],
      replyTo: { email: 'ana@example.com', name: 'Ana Pérez' },
      subject: '[SmartPet] Consulta de adopción',
    });
    expect(String(body.htmlContent)).toContain('&lt;script&gt;');
    expect(String(body.htmlContent)).not.toContain('<script>');
  });

  it('responde 503 si el proveedor no está configurado', async () => {
    const service = new ContactoService({
      ...enabledConfig,
      enabled: false,
      apiKey: undefined,
      senderEmail: undefined,
    });
    await expect(service.enviar(dto, '127.0.0.2')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('responde 503 sin revelar el error del proveedor', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 401 }));
    const service = new ContactoService(enabledConfig);
    await expect(service.enviar(dto, '127.0.0.3')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('limita el cuarto intento de una IP dentro de la ventana', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 201 }));
    const service = new ContactoService(enabledConfig);
    await service.enviar(dto, '127.0.0.4');
    await service.enviar(dto, '127.0.0.4');
    await service.enviar(dto, '127.0.0.4');
    await expect(service.enviar(dto, '127.0.0.4')).rejects.toMatchObject({
      status: 429,
    });
  });
});
