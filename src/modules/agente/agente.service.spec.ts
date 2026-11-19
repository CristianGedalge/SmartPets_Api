import {
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AgenteService } from './agente.service';
import { RolMensajeAgente } from './dto/chat-agente.dto';

const config = {
  enabled: true,
  token: 'test-token-that-is-long-enough-for-bedrock',
  region: 'us-east-1',
  modelId: 'us.amazon.nova-lite-v1:0',
};

const cupo = {
  verificar: jest.fn().mockResolvedValue(undefined),
  consumir: jest.fn().mockResolvedValue(undefined),
};

describe('AgenteService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envía el historial a Converse y devuelve el texto', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          output: { message: { content: [{ text: 'Abre Alertas.' }] } },
        }),
        { status: 200 },
      ),
    );
    const service = new AgenteService(config, cupo as never);
    await expect(
      service.responder('user-1', {
        mensajes: [
          { rol: RolMensajeAgente.USUARIO, contenido: '¿Cómo publico?' },
        ],
      }),
    ).resolves.toEqual({ respuesta: 'Abre Alertas.' });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://bedrock-runtime.us-east-1.amazonaws.com/model/us.amazon.nova-lite-v1%3A0/converse',
    );
    const request = fetchMock.mock.calls[0][1];
    expect(request?.headers).toMatchObject({
      Authorization: `Bearer ${config.token}`,
    });
  });

  it('rechaza historiales que no alternan roles', async () => {
    const service = new AgenteService(config, cupo as never);
    await expect(
      service.responder('user-2', {
        mensajes: [{ rol: RolMensajeAgente.ASISTENTE, contenido: 'Hola' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 503 si no está configurado o el proveedor falla', async () => {
    const disabled = new AgenteService(
      {
        ...config,
        enabled: false,
        token: undefined,
      },
      cupo as never,
    );
    await expect(
      disabled.responder('user-3', {
        mensajes: [{ rol: RolMensajeAgente.USUARIO, contenido: 'Hola' }],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 403 }));
    await expect(
      new AgenteService(config, cupo as never).responder('user-4', {
        mensajes: [{ rol: RolMensajeAgente.USUARIO, contenido: 'Hola' }],
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('responde el sitio sin usar el cupo del ciudadano', async () => {
    cupo.verificar.mockClear();
    cupo.consumir.mockClear();
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            output: {
              message: { content: [{ text: 'Puedes ver Adopciones.' }] },
            },
          }),
          { status: 200 },
        ),
    );
    const service = new AgenteService(config, cupo as never);
    await expect(
      service.responderSitio('203.0.113.8', {
        mensajes: [{ rol: RolMensajeAgente.USUARIO, contenido: '¿Y las adopciones?' }],
      }),
    ).resolves.toEqual({ respuesta: 'Puedes ver Adopciones.' });
    expect(cupo.verificar).not.toHaveBeenCalled();
    expect(cupo.consumir).not.toHaveBeenCalled();
    const request = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(request?.body)) as {
      system: Array<{ text: string }>;
    };
    expect(body.system[0].text).toContain('sitio web de SmartPet');
  });

  it('limita los mensajes públicos por dirección', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            output: { message: { content: [{ text: 'Hola.' }] } },
          }),
          { status: 200 },
        ),
    );
    const service = new AgenteService(config, cupo as never);
    const mensaje = {
      mensajes: [{ rol: RolMensajeAgente.USUARIO, contenido: 'Hola' }],
    };
    for (let index = 0; index < 8; index += 1) {
      await service.responderSitio('203.0.113.9', mensaje);
    }
    await expect(
      service.responderSitio('203.0.113.9', mensaje),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
