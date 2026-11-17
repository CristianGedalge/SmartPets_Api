import { Adopcion } from '../src/modules/adopciones/entities/adopcion.entity';
import { AnimalResguardado } from '../src/modules/resguardo/entities/animal-resguardado.entity';
import { PublicacionAdopcion } from '../src/modules/adopciones/entities/publicacion-adopcion.entity';
import { installInstitutionSchema } from './support/resguardo-schema';
import { ServiceUnavailableException } from '@nestjs/common';
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
integration('Avistamientos HTTP + JWT + PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  const schema = `smartpet_test_${randomUUID().replaceAll('-', '')}`;
  const alertsMigration = new AlertasExtravioSchema1794862800000();
  const users = [randomUUID(), randomUUID(), randomUUID()];
  const roles = [RolNombre.CIUDADANO, RolNombre.ENCARGADO, RolNombre.ADMIN];
  const tokens: string[] = [];
  const upload = jest.fn((_file: unknown, storageKey: string) =>
    Promise.resolve({
      storageKey,
      url: `https://images.test/${storageKey}.png`,
    }),
  );
  const destroy = jest.fn(() => Promise.resolve());
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=',
    'base64',
  );
  const client = () => request(app.getHttpServer());
  const auth = (index = 0) => `Bearer ${tokens[index]}`;
  const data = {
    especieId: '1',
    descripcion: 'Perro con collar rojo',
    direccion: 'Plaza central',
    fechaAvistamiento: '2020-01-01T12:00:00-04:00',
    latitud: '-17.7833',
    longitud: '-63.1821',
  };
  const publish = (
    index = 0,
    count = 1,
    extra: Record<string, string> = {},
  ) => {
    const req = client()
      .post('/api/v1/avistamientos')
      .set('Authorization', auth(index));
    for (const [key, value] of Object.entries({ ...data, ...extra })) {
      req.field(key, value);
    }
    for (let i = 0; i < count; i++)
      req.attach('fotos', png, {
        filename: `foto${i}.png`,
        contentType: 'image/png',
      });
    return req;
  };
  type Sighting = {
    id: string;
    estado: string;
    esPropio: boolean;
    descripcion: string;
    latitud: number;
    fotos: { id: string; url: string; esPrincipal: boolean }[];
  };
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
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    for (let i = 0; i < users.length; i++) {
      await db.getRepository(Rol).save({ nombre: roles[i] });
      await db.getRepository(Usuario).save({
        id: users[i],
        rolId: i + 1,
        nombre: 'Private owner',
        apellido: 'Private surname',
        email: `private${i}@example.com`,
        telefono: '70000000',
        passwordHash: 'private-password-hash',
        estado: true,
      });
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
    await app.init();
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

  it('exige JWT para publicar y consultar historial', async () => {
    await client().post('/api/v1/avistamientos').expect(401);
    await client().get('/api/v1/avistamientos/mis-avistamientos').expect(401);
    await client().get('/api/v1/avistamientos/not-a-uuid').expect(400);
  });
  it('los tres roles publican; el publico no recibe datos privados', async () => {
    for (let i = 0; i < 3; i++) {
      const response = await publish(i).expect(201);
      const sighting = response.body as Sighting;
      expect(sighting.esPropio).toBe(true);
      expect(sighting.estado).toBe('ACTIVO');
      expect(sighting.latitud).toBe(-17.7833);
      expect(sighting.fotos).toHaveLength(1);
      const publicResponse = await client()
        .get(`/api/v1/avistamientos/${sighting.id}`)
        .expect(200);
      expect((publicResponse.body as Sighting).esPropio).toBe(false);
      for (const key of [
        'usuarioId',
        'storageKey',
        'passwordHash',
        'email',
        'telefono',
      ])
        expect(JSON.stringify(publicResponse.body)).not.toContain(key);
    }
  });
  it('rechaza campos extra, fechas futuras, especie inexistente y fotos ausentes', async () => {
    await publish(0, 1, { usuarioId: users[1] }).expect(400);
    await publish(0, 1, { estado: 'CERRADO' }).expect(400);
    await publish(0, 1, { fechaAvistamiento: '2999-01-01T00:00:00Z' }).expect(
      400,
    );
    await publish(0, 1, { especieId: '2147483647' }).expect(400);
    await publish(0, 0).expect(400);
    await publish(0, 1, { latitud: '' }).expect(400);
  });
  it('protege propiedad y conserva historial privado tras cierre', async () => {
    const item = (await publish().expect(201)).body as Sighting;
    await client()
      .patch(`/api/v1/avistamientos/${item.id}`)
      .set('Authorization', auth(2))
      .send({ descripcion: 'Ajeno' })
      .expect(404);
    await client()
      .patch(`/api/v1/avistamientos/${item.id}/cerrar`)
      .set('Authorization', auth(1))
      .send({})
      .expect(404);
    await client()
      .patch(`/api/v1/avistamientos/${item.id}`)
      .set('Authorization', auth())
      .send({ descripcion: 'Actualizado', latitud: 0 })
      .expect(200);
    const closed = (
      await client()
        .patch(`/api/v1/avistamientos/${item.id}/cerrar`)
        .set('Authorization', auth())
        .send({})
        .expect(200)
    ).body as Sighting;
    expect(closed.estado).toBe('CERRADO');
    await client().get(`/api/v1/avistamientos/${item.id}`).expect(404);
    await client()
      .get(`/api/v1/avistamientos/${item.id}`)
      .set('Authorization', auth(1))
      .expect(404);
    await client()
      .get(`/api/v1/avistamientos/${item.id}`)
      .set('Authorization', auth())
      .expect(200);
    await client()
      .patch(`/api/v1/avistamientos/${item.id}`)
      .set('Authorization', auth())
      .send({ direccion: 'Otro' })
      .expect(409);
    const mine = (
      await client()
        .get('/api/v1/avistamientos/mis-avistamientos')
        .set('Authorization', auth())
        .expect(200)
    ).body as Sighting[];
    expect(mine.some((e) => e.id === item.id && e.estado === 'CERRADO')).toBe(
      true,
    );
    const list = (
      await client().get('/api/v1/avistamientos?limit=100&offset=0').expect(200)
    ).body as Sighting[];
    expect(list.some((e) => e.id === item.id)).toBe(false);
  });
  it('cancela y no acepta estado enviado por cliente en acciones', async () => {
    const item = (await publish().expect(201)).body as Sighting;
    await client()
      .patch(`/api/v1/avistamientos/${item.id}/cancelar`)
      .set('Authorization', auth())
      .send({ estado: 'ACTIVO' })
      .expect(400);
    const result = (
      await client()
        .patch(`/api/v1/avistamientos/${item.id}/cancelar`)
        .set('Authorization', auth())
        .send({})
        .expect(200)
    ).body as Sighting;
    expect(result.estado).toBe('CANCELADO');
    await client()
      .post(`/api/v1/avistamientos/${item.id}/fotos`)
      .set('Authorization', auth())
      .attach('fotos', png, 'photo.png')
      .expect(409);
  });
  it('mantiene limites, propiedad y principal con eliminaciones concurrentes', async () => {
    const item = (await publish(0, 2).expect(201)).body as Sighting;
    await client()
      .delete(`/api/v1/avistamientos/${item.id}/fotos/${item.fotos[0].id}`)
      .set('Authorization', auth(2))
      .expect(404);
    const results = await Promise.all(
      item.fotos.map((photo) =>
        client()
          .delete(`/api/v1/avistamientos/${item.id}/fotos/${photo.id}`)
          .set('Authorization', auth()),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    const current = (
      await client()
        .get(`/api/v1/avistamientos/${item.id}`)
        .set('Authorization', auth())
        .expect(200)
    ).body as Sighting;
    expect(current.fotos).toHaveLength(1);
    expect(current.fotos[0].esPrincipal).toBe(true);
    const full = (await publish(0, 5).expect(201)).body as Sighting;
    await client()
      .post(`/api/v1/avistamientos/${full.id}/fotos`)
      .set('Authorization', auth())
      .attach('fotos', png, 'photo.png')
      .expect(400);
  });
  it('revalida limite bajo bloqueo frente a subidas simultaneas', async () => {
    const item = (await publish(0, 4).expect(201)).body as Sighting;
    const results = await Promise.all(
      [0, 1].map(() =>
        client()
          .post(`/api/v1/avistamientos/${item.id}/fotos`)
          .set('Authorization', auth())
          .attach('fotos', png, 'photo.png'),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const current = (
      await client().get(`/api/v1/avistamientos/${item.id}`).expect(200)
    ).body as Sighting;
    expect(current.fotos).toHaveLength(5);
  });
  it('conserva compensacion si falla almacenamiento sin crear reporte', async () => {
    const count = await db.getRepository(Avistamiento).count();
    upload.mockRejectedValueOnce(new ServiceUnavailableException('offline'));
    await publish().expect(503);
    expect(await db.getRepository(Avistamiento).count()).toBe(count);
    expect(await db.getRepository(ArchivoPendiente).count()).toBeGreaterThan(0);
  });
});
