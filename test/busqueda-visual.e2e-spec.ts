import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AvistamientoEmbedding } from '../src/modules/busqueda-visual/entities/avistamiento-embedding.entity';
import { BusquedaVisualSchema1795046400000 } from '../src/migrations/1795046400000-BusquedaVisualSchema';
import {
  VisualModelClient,
  VISUAL_MODEL,
} from '../src/modules/busqueda-visual/visual-model.client';
import { SightingPhotoClient } from '../src/modules/busqueda-visual/sighting-photo.client';
import { iaConfig } from '../src/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { Conversacion } from '../src/modules/chat/entities/conversacion.entity';
import { ParticipanteConversacion } from '../src/modules/chat/entities/participante-conversacion.entity';
import { Mensaje } from '../src/modules/chat/entities/mensaje.entity';
import { ChatSchema1794960000000 } from '../src/migrations/1794960000000-ChatSchema';
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
import {
  EstadoSuscripcion,
  Suscripcion,
} from '../src/modules/suscripciones/entities/suscripcion.entity';
import { SuscripcionesSchema1795060000000 } from '../src/migrations/1795060000000-SuscripcionesSchema';
import { Rol, RolNombre } from '../src/modules/roles/entities/rol.entity';
import { Establecimiento } from '../src/modules/establecimientos/entities/establecimiento.entity';
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
integration('Busqueda visual HTTP + PostgreSQL', () => {
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
  const tokens: string[] = [];
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
        AvistamientoEmbedding,
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
      await new BusquedaVisualSchema1795046400000().up(runner);
      await new SuscripcionesSchema1795060000000().up(runner);
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
    const gratis = await db
      .getRepository(Plan)
      .findOneByOrFail({ nombre: 'Gratis' });
    await db.getRepository(Suscripcion).save({
      usuarioId: users[3],
      planId: gratis.id,
      estado: EstadoSuscripcion.ACTIVA,
      inicio: new Date(),
    });
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
      .overrideProvider(SightingPhotoClient)
      .useValue({ download })
      .overrideProvider(VisualModelClient)
      .useValue({ embed })
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
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
  });

  const photoA = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=',
    'base64',
  );
  const photoB = Buffer.concat([photoA, Buffer.from('different photo')]);
  const vector = (index: number) =>
    Array.from({ length: 512 }, (_, i) => (i === index ? 1 : 0));
  const download = jest
    .fn<Promise<Buffer>, [string]>()
    .mockResolvedValue(photoA);
  const embed = jest
    .fn<Promise<number[][]>, [Buffer[]]>()
    .mockImplementation((images) =>
      Promise.resolve(
        images.map((image) => vector(image.equals(photoA) ? 0 : 1)),
      ),
    );
  const endpoint = '/api/v1/busqueda-visual/avistamientos';
  const search = (photo = photoA, index = 3, fields = { especieId: '1' }) => {
    const req = client().post(endpoint).set('Authorization', auth(index));
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req.attach('fotos', photo, {
      filename: 'consulta.png',
      contentType: 'image/png',
    });
  };
  type SearchResult = {
    modelo: string;
    resultados: {
      similitud: number;
      avistamiento: { id: string; fotos: { id: string }[] };
    }[];
    fotosNoProcesadas: number;
    fotosConsultadas: number;
  };
  async function sight(index = 0, extra: Partial<Avistamiento> = {}) {
    const report = await db.getRepository(Avistamiento).save({
      usuarioId: users[index],
      especieId: 1,
      descripcion: 'Visible sighting',
      direccion: 'Plaza',
      fechaAvistamiento: new Date('2026-11-18T12:00:00Z'),
      latitud: -17.78,
      longitud: -63.18,
      ...extra,
    });
    const photo = await db.getRepository(FotoAvistamiento).save({
      avistamientoId: report.id,
      url: `https://res.cloudinary.com/test/image/upload/${report.id}.png`,
      storageKey: `private/${report.id}`,
      proveedor: 'CLOUDINARY',
      esPrincipal: true,
    });
    return { report, photo };
  }
  beforeEach(async () => {
    await db.query('DELETE FROM avistamiento');
    await db.query('UPDATE usuario SET estado = true');
    download.mockReset().mockResolvedValue(photoA);
    embed
      .mockReset()
      .mockImplementation((images) =>
        Promise.resolve(
          images.map((image) => vector(image.equals(photoA) ? 0 : 1)),
        ),
      );
  });

  it('requiere JWT de ciudadano y rechaza campos o fotos inválidos', async () => {
    await client().post(endpoint).expect(401);
    await search(photoA, 0).expect(403);
    await search(photoA, 2).expect(403);
    await client()
      .post(endpoint)
      .set('Authorization', auth(3))
      .field('especieId', '1')
      .expect(400);
    await search(photoA, 3, { especieId: '0' }).expect(400);
    await search(photoA, 3, { especieId: '999' }).expect(400);
    await client()
      .post(endpoint)
      .set('Authorization', auth(3))
      .field('especieId', '1')
      .field('rol', 'ADMIN')
      .attach('fotos', photoA, 'a.png')
      .expect(400);
    await search(Buffer.from('not an image')).expect(400);
  });

  it('ordena coincidencias por reporte, reutiliza caché y no devuelve datos privados', async () => {
    const first = await sight();
    const second = await sight();
    download.mockImplementation((url) =>
      Promise.resolve(url.includes(first.report.id) ? photoA : photoB),
    );
    const body = (await search().expect(201)).body as SearchResult;
    expect(body.modelo).toBe(VISUAL_MODEL);
    expect(body.resultados.map((item) => item.avistamiento.id)).toEqual([
      first.report.id,
      second.report.id,
    ]);
    expect(body.resultados.map((item) => item.similitud)).toEqual([1, 0]);
    expect(JSON.stringify(body)).not.toMatch(
      /storageKey|private\/|usuarioId|password|vector|email|telefono/,
    );
    expect(await db.getRepository(AvistamientoEmbedding).count()).toBe(2);
    download.mockClear();
    embed.mockClear();
    await search().expect(201);
    expect(download).not.toHaveBeenCalled();
    expect(embed).toHaveBeenCalledTimes(1);
    await db.getRepository(FotoAvistamiento).delete(first.photo.id);
    expect(await db.getRepository(AvistamientoEmbedding).count()).toBe(1);
  });

  it('solo usa reportes activos de usuarios activos y de la especie seleccionada', async () => {
    const visible = await sight();
    await sight(1);
    await sight(0, { estado: 'CERRADO' as Avistamiento['estado'] });
    await sight(0, { estado: 'CANCELADO' as Avistamiento['estado'] });
    await sight(0, { especieId: 2 });
    await db.getRepository(Usuario).update(users[1], { estado: false });
    const body = (await search().expect(201)).body as SearchResult;
    expect(body.resultados.map((item) => item.avistamiento.id)).toEqual([
      visible.report.id,
    ]);
  });

  it('acepta varias consultas, agrupa fotos de un mismo avistamiento y limita a cinco resultados', async () => {
    for (let i = 0; i < 6; i++) await sight();
    const body = (await search().attach('fotos', photoB, 'b.png').expect(201))
      .body as SearchResult;
    expect(body.fotosConsultadas).toBe(2);
    expect(body.resultados).toHaveLength(5);
    expect(
      new Set(body.resultados.map((item) => item.avistamiento.id)).size,
    ).toBe(5);
    expect(body.resultados[0].similitud).toBe(0.5);
  });

  it('devuelve vacío real y expone fallas parciales sin inventar coincidencias', async () => {
    expect(
      ((await search().expect(201)).body as SearchResult).resultados,
    ).toEqual([]);
    const one = await sight();
    await sight();
    download.mockImplementation((url) => {
      if (url.includes(one.report.id))
        return Promise.reject(new Error('Unavailable'));
      return Promise.resolve(photoA);
    });
    const body = (await search().expect(201)).body as SearchResult;
    expect(body.resultados).toHaveLength(1);
    expect(body.fotosNoProcesadas).toBe(1);
  });

  it('revalida visibilidad si un reporte se cierra durante la inferencia', async () => {
    const item = await sight();
    download.mockImplementation(async () => {
      await db.getRepository(Avistamiento).update(item.report.id, {
        estado: 'CERRADO' as Avistamiento['estado'],
      });
      return photoA;
    });
    expect(
      ((await search().expect(201)).body as SearchResult).resultados,
    ).toEqual([]);
  });

  it('falla claramente cuando Python o todas las fotos están inaccesibles', async () => {
    embed.mockRejectedValueOnce(
      new ServiceUnavailableException('Python offline'),
    );
    await search().expect(503);
    await sight();
    download.mockRejectedValue(new Error('Offline'));
    await search().expect(503);
  });

  it('no trunca galerías que superan el límite de esta versión', async () => {
    const item = await sight();
    await db.getRepository(FotoAvistamiento).insert(
      Array.from({ length: 200 }, (_, i) => ({
        avistamientoId: item.report.id,
        url: 'https://res.cloudinary.com/test/a.png',
        storageKey: `private/extra${i}`,
        proveedor: 'CLOUDINARY',
      })),
    );
    await search().expect(422);
    expect(embed).not.toHaveBeenCalled();
  });

  (process.env.SMARTPET_TEST_IA === '1' ? it : it.skip)(
    'integra HTTP NestJS con Python y el ONNX real en CPU',
    async () => {
      const first = await sight();
      const second = await sight();
      const root = join(
        __dirname,
        '..',
        '..',
        'smartpet_ia',
        'data',
        'processed',
        'dogfacenet',
      );
      const query = readFileSync(join(root, '0', '0.0.jpg'));
      download.mockImplementation((url) =>
        Promise.resolve(
          readFileSync(
            url.includes(first.report.id)
              ? join(root, '0', '0.1.jpg')
              : join(root, '1', '1.0.jpg'),
          ),
        ),
      );
      const realModel = new VisualModelClient(iaConfig());
      embed.mockImplementation((images) => realModel.embed(images));
      const body = (
        await client()
          .post(endpoint)
          .set('Authorization', auth(3))
          .field('especieId', '1')
          .attach('fotos', query, {
            filename: 'query.jpg',
            contentType: 'image/jpeg',
          })
          .expect(201)
      ).body as SearchResult;
      expect(body.resultados[0].avistamiento.id).toBe(first.report.id);
      expect(body.resultados[1].avistamiento.id).toBe(second.report.id);
      expect(body.resultados[0].similitud).toBeGreaterThan(
        body.resultados[1].similitud,
      );
    },
    30000,
  );
});
