import { Conversacion } from '../src/modules/chat/entities/conversacion.entity';
import { ParticipanteConversacion } from '../src/modules/chat/entities/participante-conversacion.entity';
import { Mensaje } from '../src/modules/chat/entities/mensaje.entity';
import { ChatSchema1794960000000 } from '../src/migrations/1794960000000-ChatSchema';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { Adopcion } from '../src/modules/adopciones/entities/adopcion.entity';
import { AnimalResguardado } from '../src/modules/resguardo/entities/animal-resguardado.entity';
import { PublicacionAdopcion } from '../src/modules/adopciones/entities/publicacion-adopcion.entity';
import { installInstitutionSchema } from './support/resguardo-schema';
import { Avistamiento } from '../src/modules/avistamientos/entities/avistamiento.entity';
import { FotoAvistamiento } from '../src/modules/avistamientos/entities/foto-avistamiento.entity';
import { AvistamientosSchema1794945600000 } from '../src/migrations/1794945600000-AvistamientosSchema';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { cloudinaryConfig, databaseConfig, jwtConfig } from '../src/config';
import { Usuario } from '../src/modules/usuarios/entities/usuario.entity';
import { Consumo } from '../src/modules/suscripciones/entities/consumo.entity';
import { Pago } from '../src/modules/suscripciones/entities/pago.entity';
import { Plan } from '../src/modules/suscripciones/entities/plan.entity';
import { Suscripcion } from '../src/modules/suscripciones/entities/suscripcion.entity';
import { Rol, RolNombre } from '../src/modules/roles/entities/rol.entity';
import {
  TipoEstablecimiento,
  Establecimiento,
} from '../src/modules/establecimientos/entities/establecimiento.entity';
import { Especie } from '../src/modules/especies/entities/especie.entity';
import { Mascota } from '../src/modules/mascotas/entities/mascota.entity';
import { FotoMascota } from '../src/modules/mascotas/entities/foto-mascota.entity';
import { ArchivoPendiente } from '../src/modules/almacenamiento/entities/archivo-pendiente.entity';
import { CloudinaryService } from '../src/modules/almacenamiento/cloudinary.service';
import { AlertaExtravio } from '../src/modules/alertas-extravio/entities/alerta-extravio.entity';
import { MascotasSchema1794859200000 } from '../src/migrations/1794859200000-MascotasSchema';
import { AlertasExtravioSchema1794862800000 } from '../src/migrations/1794862800000-AlertasExtravioSchema';

const integration =
  process.env.SMARTPET_TEST_DATABASE === '1' ? describe : describe.skip;
integration('Chat privado HTTP y WebSocket + PostgreSQL', () => {
  const sockets: ClientSocket[] = [];
  let app: INestApplication<App>;
  let db: DataSource;
  const schema = `smartpet_test_${randomUUID().replaceAll('-', '')}`;
  const alertsMigration = new AlertasExtravioSchema1794862800000();
  const users = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const roles = [
    RolNombre.ENCARGADO,
    RolNombre.ENCARGADO,
    RolNombre.ADMIN,
    RolNombre.CIUDADANO,
  ];
  const institutions: string[] = [],
    tokens: string[] = [];
  const upload = jest.fn((_file: unknown, storageKey: string) =>
    Promise.resolve({
      storageKey,
      url: `https://images.test/${storageKey}.png`,
    }),
  );
  const destroy = jest.fn(() => Promise.resolve());
  const client = () => request(app.getHttpServer());
  const auth = (index = 0) => `Bearer ${tokens[index]}`;
  beforeAll(async () => {
    const conf = databaseConfig();
    db = new DataSource({
      type: 'postgres',
      host: conf.host,
      port: conf.port,
      username: conf.username,
      password: conf.password,
      database: conf.name,
      schema,
      extra: {
        options: `-c search_path=${schema},public`,
        connectionTimeoutMillis: 3000,
      },
      synchronize: false,
      entities: [
        Rol,
        Usuario,
        Plan,
        Suscripcion,
        Consumo,
        Pago,
        Establecimiento,
        Especie,
        Mascota,
        FotoMascota,
        ArchivoPendiente,
        AlertaExtravio,
        Avistamiento,
        FotoAvistamiento,
        AnimalResguardado,
        PublicacionAdopcion,
        Adopcion,
        Conversacion,
        ParticipanteConversacion,
        Mensaje,
      ],
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(
      `CREATE FUNCTION "${schema}".uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT (substr(v,1,8) || '-' || substr(v,9,4) || '-4' || substr(v,14,3) || '-8' || substr(v,18,3) || '-' || substr(v,21,12))::uuid FROM (SELECT md5(random()::text || clock_timestamp()::text) AS v) s $$`,
    );
    await db.query(
      'CREATE TABLE rol (id SERIAL PRIMARY KEY, nombre varchar(30) NOT NULL UNIQUE)',
    );
    await db.query(`CREATE TABLE usuario (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), rol_id integer NOT NULL REFERENCES rol(id), nombre varchar(100) NOT NULL, apellido varchar(100) NOT NULL,
      telefono varchar(20), foto_url text, email varchar(150) NOT NULL UNIQUE, password_hash varchar(255) NOT NULL, estado boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await new MascotasSchema1794859200000().up(runner);
      await alertsMigration.up(runner);
      await new AvistamientosSchema1794945600000().up(runner);
      await installInstitutionSchema(runner);
      await new ChatSchema1794960000000().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    for (let i = 0; i < users.length; i++) {
      const role =
        (await db.getRepository(Rol).findOneBy({ nombre: roles[i] })) ??
        (await db.getRepository(Rol).save({ nombre: roles[i] }));
      await db.getRepository(Usuario).save({
        id: users[i],
        rolId: role.id,
        nombre: 'Private owner',
        apellido: 'Private surname',
        email: `private${i}@example.com`,
        telefono: '70000000',
        passwordHash: 'private-password-hash',
        estado: true,
      });
    }
    for (let i = 0; i < 2; i++) {
      const item = await db.getRepository(Establecimiento).save({
        usuarioId: users[i],
        nombre: `Institucion ${i}`,
        tipo:
          i === 0
            ? TipoEstablecimiento.VETERINARIA
            : TipoEstablecimiento.REFUGIO,
        direccion: 'Plaza',
        telefono: '70000000',
        estado: true,
      });
      institutions.push(item.id);
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(db)
      .overrideProvider(jwtConfig.KEY)
      .useValue({ secret: 'isolated-test-secret', expiresIn: '1h' })
      .overrideProvider(cloudinaryConfig.KEY)
      .useValue({
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
      })
      .overrideProvider(CloudinaryService)
      .useValue({ upload, destroy })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    const jwt = app.get(JwtService);
    for (let i = 0; i < users.length; i++)
      tokens.push(
        await jwt.signAsync({
          sub: users[i],
          email: `private${i}@example.com`,
          rol: roles[i],
        }),
      );
  }, 30000);

  afterAll(async () => {
    if (db?.isInitialized && /^smartpet_test_[a-f0-9]{32}$/.test(schema))
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    for (const socket of sockets) socket.disconnect();
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
  });

  async function context(kind: 'sighting' | 'alert' = 'sighting') {
    if (kind === 'sighting') {
      const item = await db.getRepository(Avistamiento).save({
        usuarioId: users[0],
        especieId: 1,
        descripcion: 'Mascota vista',
        direccion: 'Plaza',
        latitud: -16,
        longitud: -68,
        fechaAvistamiento: new Date(),
        estado: 'ACTIVO' as Avistamiento['estado'],
      });
      return { avistamientoId: item.id };
    }
    const pet = await db.getRepository(Mascota).save({
      usuarioId: users[0],
      nombre: 'Luna',
      especieId: 1,
      estado: true,
    });
    const item = await db.getRepository(AlertaExtravio).save({
      mascotaId: pet.id,
      descripcion: 'Buscamos a Luna',
      fechaExtravio: new Date(),
      latitud: -16,
      longitud: -68,
      estado: 'ACTIVA' as AlertaExtravio['estado'],
    });
    return { alertaId: item.id };
  }
  const open = (data: object, index = 3) =>
    client()
      .post('/api/v1/chat/conversaciones')
      .set('Authorization', auth(index))
      .send(data);
  const send = (
    id: string,
    messageId = randomUUID(),
    text = 'Hola, creo que vi a tu mascota',
    index = 3,
  ) =>
    client()
      .post(`/api/v1/chat/conversaciones/${id}/mensajes`)
      .set('Authorization', auth(index))
      .send({ id: messageId, contenido: text });
  type Chat = {
    id: string;
    noLeidos: number;
    interlocutor: { nombre: string };
  };
  type Message = {
    id: string;
    contenido: string;
    createdAt: string;
    esPropio: boolean;
  };
  async function connection(index: number, token = tokens[index]) {
    const socket = io(`${await app.getUrl()}/chat`, {
      transports: ['websocket'],
      auth: { token },
      forceNew: true,
      reconnection: false,
      autoConnect: false,
    });
    sockets.push(socket);
    return socket;
  }
  const connected = (socket: ClientSocket) =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket timeout')), 4000);
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('connect_error', (error: Error) => {
        clearTimeout(timer);
        reject(error);
      });
      socket.connect();
    });
  it.each(['sighting', 'alert'] as const)(
    'abre una sola conversación concurrente por pareja y contexto %s',
    async (kind) => {
      const data = await context(kind);
      const results = await Promise.all([open(data), open(data)]);
      expect(results.map((result) => result.status)).toEqual([201, 201]);
      const first = results[0].body as Chat;
      const second = results[1].body as Chat;
      expect(first.id).toBe(second.id);
      expect(
        await db
          .getRepository(ParticipanteConversacion)
          .countBy({ conversacionId: first.id }),
      ).toBe(2);
      const owner = await client()
        .get(`/api/v1/chat/conversaciones/${first.id}`)
        .set('Authorization', auth())
        .expect(200);
      expect((owner.body as Chat).id).toBe(first.id);
      const separate = (await open(data, 1).expect(201)).body as Chat;
      expect(separate.id).not.toBe(first.id);
      for (const field of [
        'email',
        'telefono',
        'passwordHash',
        'storageKey',
        'usuarioId',
      ])
        expect(JSON.stringify(results[0].body)).not.toContain(field);
    },
  );
  it('protege sesión, autochat, contexto y campos inyectados', async () => {
    const data = await context();
    await client().post('/api/v1/chat/conversaciones').send(data).expect(401);
    await open(data, 0).expect(409);
    for (const payload of [
      {},
      { ...data, alertaId: randomUUID() },
      { ...data, usuarioId: users[1] },
      { avistamientoId: null },
    ])
      await open(payload).expect(400);
    await open({ avistamientoId: randomUUID() }).expect(404);
    await db.getRepository(Avistamiento).update(data.avistamientoId!, {
      estado: 'CERRADO' as Avistamiento['estado'],
    });
    await open(data).expect(404);
  });
  it('terceros no leen, envían, marcan lectura ni encuentran mensajes ajenos', async () => {
    const chat = (await open(await context()).expect(201)).body as Chat;
    const message = (await send(chat.id).expect(201)).body as Message;
    for (const suffix of ['', '/mensajes'])
      await client()
        .get(`/api/v1/chat/conversaciones/${chat.id}${suffix}`)
        .set('Authorization', auth(1))
        .expect(404);
    await send(chat.id, randomUUID(), 'Intruso', 1).expect(404);
    await client()
      .patch(`/api/v1/chat/conversaciones/${chat.id}/lectura`)
      .set('Authorization', auth(1))
      .send({ mensajeId: message.id })
      .expect(404);
    const list = await client()
      .get('/api/v1/chat/conversaciones?limit=50')
      .set('Authorization', auth(1))
      .expect(200);
    expect((list.body as Chat[]).some((item) => item.id === chat.id)).toBe(
      false,
    );
  });
  it('envío es idempotente, páginas completas y lectura nunca adelanta ni retrocede', async () => {
    const chat = (await open(await context()).expect(201)).body as Chat;
    const messageId = randomUUID();
    const results = await Promise.all([
      send(chat.id, messageId),
      send(chat.id, messageId),
    ]);
    expect(results.map((result) => result.status)).toEqual([201, 201]);
    expect(await db.getRepository(Mensaje).countBy({ id: messageId })).toBe(1);
    await send(chat.id, messageId, 'Texto cambiado').expect(409);
    const second = (await send(chat.id, randomUUID(), 'Segundo').expect(201))
      .body as Message;
    const third = (await send(chat.id, randomUUID(), 'Tercero').expect(201))
      .body as Message;
    const recent = await client()
      .get(`/api/v1/chat/conversaciones/${chat.id}/mensajes?limit=2`)
      .set('Authorization', auth())
      .expect(200);
    const page = recent.body as { items: Message[]; hayMas: boolean };
    expect(page.hayMas).toBe(true);
    expect(page.items.map((m) => m.id)).toEqual([second.id, third.id]);
    expect(page.items.every((m) => !m.esPropio)).toBe(true);
    const older = await client()
      .get(
        `/api/v1/chat/conversaciones/${chat.id}/mensajes?antesDe=${second.id}`,
      )
      .set('Authorization', auth())
      .expect(200);
    expect((older.body as { items: Message[] }).items[0].id).toBe(messageId);
    const recovered = await client()
      .get(
        `/api/v1/chat/conversaciones/${chat.id}/mensajes?despuesDe=${messageId}`,
      )
      .set('Authorization', auth())
      .expect(200);
    expect(
      (recovered.body as { items: Message[] }).items.map((m) => m.id),
    ).toEqual([second.id, third.id]);
    const read = (id: string) =>
      client()
        .patch(`/api/v1/chat/conversaciones/${chat.id}/lectura`)
        .set('Authorization', auth())
        .send({ mensajeId: id });
    await read(second.id).expect(200);
    await read(messageId).expect(200);
    const summary = await client()
      .get(`/api/v1/chat/conversaciones/${chat.id}`)
      .set('Authorization', auth())
      .expect(200);
    expect((summary.body as Chat).noLeidos).toBe(1);
    await read(third.id).expect(200);
    const end = await client()
      .get('/api/v1/chat/conversaciones?limit=50&offset=0')
      .set('Authorization', auth())
      .expect(200);
    expect(
      (end.body as Chat[]).find((item) => item.id === chat.id)?.noLeidos,
    ).toBe(0);
  });
  it('valida texto, paginación y cursores y conserva historial al cerrar publicación', async () => {
    const data = await context();
    const chat = (await open(data).expect(201)).body as Chat;
    for (const text of ['', '  ', 'x'.repeat(4001)])
      await send(chat.id, randomUUID(), text).expect(400);
    await client()
      .get('/api/v1/chat/conversaciones?limit=100')
      .set('Authorization', auth())
      .expect(400);
    await client()
      .get(
        `/api/v1/chat/conversaciones/${chat.id}/mensajes?antesDe=${randomUUID()}`,
      )
      .set('Authorization', auth())
      .expect(400);
    const other = (await open(await context()).expect(201)).body as Chat;
    const foreign = (await send(other.id).expect(201)).body as Message;
    await client()
      .patch(`/api/v1/chat/conversaciones/${chat.id}/lectura`)
      .set('Authorization', auth())
      .send({ mensajeId: foreign.id })
      .expect(400);
    await db.getRepository(Avistamiento).update(data.avistamientoId!, {
      estado: 'CERRADO' as Avistamiento['estado'],
    });
    expect(((await open(data).expect(201)).body as Chat).id).toBe(chat.id);
    await send(chat.id).expect(201);
    await db.getRepository(Usuario).update(users[0], { estado: false });
    try {
      await send(chat.id).expect(403);
    } finally {
      await db.getRepository(Usuario).update(users[0], { estado: true });
    }
  });
  it('Socket.IO rechaza usuarios inactivos y desconecta al expirar el token', async () => {
    await db.getRepository(Usuario).update(users[1], { estado: false });
    const inactive = await connection(1);
    try {
      await expect(connected(inactive)).rejects.toThrow();
    } finally {
      inactive.disconnect();
      await db.getRepository(Usuario).update(users[1], { estado: true });
    }
    const jwt = app.get(JwtService);
    const short = await jwt.signAsync(
      { sub: users[3], rol: roles[3] },
      { expiresIn: '2s' },
    );
    const socket = await connection(3, short);
    await connected(socket);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Token expiry did not disconnect socket')),
        4000,
      );
      socket.once('disconnect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    expect(socket.connected).toBe(false);
  });
  it('Socket.IO rechaza tokens inválidos y notifica solo participantes', async () => {
    const bad = await connection(3, 'invalid');
    await expect(connected(bad)).rejects.toThrow();
    bad.disconnect();
    const chat = (await open(await context()).expect(201)).body as Chat;
    const owner = await connection(0),
      citizen = await connection(3),
      stranger = await connection(1);
    await Promise.all([
      connected(owner),
      connected(citizen),
      connected(stranger),
    ]);
    const leaked: unknown[] = [];
    stranger.on('chat:actualizado', (data: unknown) => leaked.push(data));
    const event = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Missing realtime event')),
        3000,
      );
      owner.once('chat:actualizado', (data: unknown) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
    // Arbitrary client events cannot join another user's room.
    stranger.emit('join', `user:${users[0]}`);
    await send(chat.id).expect(201);
    await expect(event).resolves.toEqual({ conversacionId: chat.id });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(leaked).toHaveLength(0);
    for (const socket of [owner, citizen, stranger]) socket.disconnect();
  });
});
