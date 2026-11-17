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
import { Rol, RolNombre } from '../src/modules/roles/entities/rol.entity';
import { Establecimiento } from '../src/modules/establecimientos/entities/establecimiento.entity';
import { Especie } from '../src/modules/especies/entities/especie.entity';
import { Mascota } from '../src/modules/mascotas/entities/mascota.entity';
import { FotoMascota } from '../src/modules/mascotas/entities/foto-mascota.entity';
import { ArchivoPendiente } from '../src/modules/almacenamiento/entities/archivo-pendiente.entity';
import { CloudinaryService } from '../src/modules/almacenamiento/cloudinary.service';
import { LimpiezaArchivosService } from '../src/modules/almacenamiento/limpieza-archivos.service';
import { AlertaExtravio } from '../src/modules/alertas-extravio/entities/alerta-extravio.entity';
import { EstadoAlerta } from '../src/modules/alertas-extravio/enums/estado-alerta.enum';
import { MascotasSchema1794859200000 } from '../src/migrations/1794859200000-MascotasSchema';
import { AlertasExtravioSchema1794862800000 } from '../src/migrations/1794862800000-AlertasExtravioSchema';

const integration =
  process.env.SMARTPET_TEST_DATABASE === '1' ? describe : describe.skip;
integration('Alertas extravio HTTP + JWT + PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  const schema = `smartpet_test_${randomUUID().replaceAll('-', '')}`;
  const alertsMigration = new AlertasExtravioSchema1794862800000();
  const users = [randomUUID(), randomUUID(), randomUUID()];
  const roles = [RolNombre.CIUDADANO, RolNombre.ENCARGADO, RolNombre.ADMIN];
  const tokens: string[] = [];
  const client = () => request(app.getHttpServer());
  const auth = (index = 0) => `Bearer ${tokens[index]}`;
  const alertData = (mascotaId: string) => ({
    mascotaId,
    descripcion: 'Cerca de la plaza',
    fechaExtravio: '2020-01-01T12:00:00-04:00',
    latitud: -17.7833,
    longitud: -63.1821,
  });
  type AlertResponse = {
    id: string;
    mascotaId: string;
    estado: EstadoAlerta;
    descripcion: string | null;
    fechaExtravio: string;
    fechaResolucion: string | null;
    latitud: number;
    longitud: number;
    mascota: {
      id: string;
      nombre: string;
      fotoPrincipal: { id: string; url: string } | null;
    };
  };
  const publish = (mascotaId: string, index = 0) =>
    client()
      .post('/api/v1/alertas-extravio')
      .set('Authorization', auth(index))
      .send(alertData(mascotaId));
  const pet = async (index = 0, photos = true, active = true) => {
    const mascota = await db.getRepository(Mascota).save({
      usuarioId: users[index],
      especieId: 1,
      nombre: 'Luna',
      estado: active,
    });
    if (photos) {
      await db.getRepository(FotoMascota).save([
        {
          mascotaId: mascota.id,
          url: 'https://images.test/principal.png',
          storageKey: `private-main-${randomUUID()}`,
          proveedor: 'CLOUDINARY',
          esPrincipal: true,
        },
        {
          mascotaId: mascota.id,
          url: 'https://images.test/secondary.png',
          storageKey: `private-second-${randomUUID()}`,
          proveedor: 'CLOUDINARY',
          esPrincipal: false,
        },
      ]);
    }
    return mascota;
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
      .useValue({ upload: jest.fn(), destroy: jest.fn() })
      .overrideProvider(LimpiezaArchivosService)
      .useValue({ processOne: jest.fn() })
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

  it('protege rutas privadas y permite listado publico sin JWT', async () => {
    await client()
      .post('/api/v1/alertas-extravio')
      .send(alertData(randomUUID()))
      .expect(401);
    await client().get('/api/v1/alertas-extravio/mis-alertas').expect(401);
    await client()
      .patch(`/api/v1/alertas-extravio/${randomUUID()}/resolver`)
      .send({})
      .expect(401);
    const list = await client().get('/api/v1/alertas-extravio').expect(200);
    expect(list.body).toEqual([]);
    await client().get('/api/v1/alertas-extravio/not-a-uuid').expect(400);
  });

  it('los tres roles publican propias, sin privilegio global de ADMIN', async () => {
    for (let i = 0; i < users.length; i++) {
      const mascota = await pet(i);
      const response = await publish(mascota.id, i).expect(201);
      const alerta = response.body as AlertResponse;
      expect(alerta.estado).toBe(EstadoAlerta.ACTIVA);
      expect(alerta.fechaResolucion).toBeNull();
      await publish(mascota.id, (i + 1) % 3).expect(404);
    }
    const inactive = await pet(0, true, false);
    await publish(inactive.id).expect(404);
    await publish(randomUUID()).expect(404);
    await db.getRepository(Usuario).update(users[2], { estado: false });
    await client()
      .get('/api/v1/alertas-extravio/mis-alertas')
      .set('Authorization', auth(2))
      .expect(401);
    await db.getRepository(Usuario).update(users[2], { estado: true });
  });

  it('lista solo alertas activas de mascotas activas y no expone datos privados', async () => {
    const visiblePet = await pet();
    const visible = (await publish(visiblePet.id).expect(201))
      .body as AlertResponse;
    const noPhotoPet = await pet(0, false);
    const noPhoto = (await publish(noPhotoPet.id).expect(201))
      .body as AlertResponse;
    const cancelledPet = await pet();
    const cancelled = (await publish(cancelledPet.id).expect(201))
      .body as AlertResponse;
    await client()
      .patch(`/api/v1/alertas-extravio/${cancelled.id}/cancelar`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    const resolvedPet = await pet();
    const resolved = (await publish(resolvedPet.id).expect(201))
      .body as AlertResponse;
    await client()
      .patch(`/api/v1/alertas-extravio/${resolved.id}/resolver`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    const hiddenPet = await pet();
    const hidden = (await publish(hiddenPet.id).expect(201))
      .body as AlertResponse;
    await db
      .getRepository(AlertaExtravio)
      .update(hidden.id, { estado: EstadoAlerta.OCULTA });
    const inactivePet = await pet();
    const inactive = (await publish(inactivePet.id).expect(201))
      .body as AlertResponse;
    await client()
      .delete(`/api/v1/mascotas/${inactivePet.id}`)
      .set('Authorization', auth())
      .expect(200);
    const list = await client()
      .get('/api/v1/alertas-extravio?limit=100')
      .expect(200);
    const alerts = list.body as AlertResponse[];
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain(visible.id);
    expect(ids).toContain(noPhoto.id);
    for (const id of [cancelled.id, resolved.id, hidden.id, inactive.id]) {
      expect(ids).not.toContain(id);
      await client().get(`/api/v1/alertas-extravio/${id}`).expect(404);
      await client()
        .get(`/api/v1/alertas-extravio/${id}`)
        .set('Authorization', auth())
        .expect(200);
      await client()
        .get(`/api/v1/alertas-extravio/${id}`)
        .set('Authorization', auth(2))
        .expect(404);
    }
    const detail = (
      await client().get(`/api/v1/alertas-extravio/${visible.id}`).expect(200)
    ).body as AlertResponse;
    expect(detail.mascota.fotoPrincipal).toMatchObject({
      url: 'https://images.test/principal.png',
    });
    expect(
      (await client().get(`/api/v1/alertas-extravio/${noPhoto.id}`).expect(200))
        .body as AlertResponse,
    ).toMatchObject({ mascota: { fotoPrincipal: null } });
    for (const key of [
      'usuarioId',
      'usuario_id',
      'passwordHash',
      'password_hash',
      'telefono',
      'email',
      'storageKey',
      'storage_key',
      'secondary.png',
      'Private owner',
    ])
      expect(JSON.stringify(list.body)).not.toContain(key);
    expect(typeof detail.latitud).toBe('number');
    expect(typeof detail.longitud).toBe('number');
    await client()
      .get(`/api/v1/alertas-extravio/${visible.id}`)
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    const history = await client()
      .get('/api/v1/alertas-extravio/mis-alertas?limit=100')
      .set('Authorization', auth())
      .expect(200);
    const historyIds = (history.body as AlertResponse[]).map((a) => a.id);
    for (const id of [cancelled.id, resolved.id, hidden.id, inactive.id])
      expect(historyIds).toContain(id);
  });

  it('valida fechas, rangos y campos extras antes de crear', async () => {
    const mascota = await pet();
    const before = await db.getRepository(AlertaExtravio).count();
    for (const invalid of [
      { estado: 'RESUELTA' },
      { fechaResolucion: '2020-01-01T00:00:00Z' },
      { usuario_id: users[1] },
      { radio_km: 10 },
      { createdAt: '2020-01-01' },
      { latitud: 91 },
      { longitud: -181 },
      { latitud: '0' },
      { fechaExtravio: '2999-01-01T00:00:00Z' },
      { fechaExtravio: '2020-02-30T12:00:00Z' },
    ]) {
      await client()
        .post('/api/v1/alertas-extravio')
        .set('Authorization', auth())
        .send({ ...alertData(mascota.id), ...invalid })
        .expect(400);
    }
    expect(await db.getRepository(AlertaExtravio).count()).toBe(before);
  });

  it('un usuario y un ADMIN no pueden modificar, resolver o cancelar alertas ajenas', async () => {
    const mascota = await pet();
    const alerta = (await publish(mascota.id).expect(201))
      .body as AlertResponse;
    for (const index of [1, 2])
      for (const suffix of ['', '/resolver', '/cancelar'])
        await client()
          .patch(`/api/v1/alertas-extravio/${alerta.id}${suffix}`)
          .set('Authorization', auth(index))
          .send(suffix ? {} : { descripcion: 'Ajena' })
          .expect(404);
    expect(
      await db.getRepository(AlertaExtravio).findOneBy({ id: alerta.id }),
    ).toMatchObject({
      estado: EstadoAlerta.ACTIVA,
      descripcion: 'Cerca de la plaza',
    });
  });

  it('PATCH permite solo los cuatro campos y conserva mascota y estado', async () => {
    const mascota = await pet();
    const alerta = (await publish(mascota.id).expect(201))
      .body as AlertResponse;
    for (const fields of [
      { mascotaId: randomUUID() },
      { estado: 'OCULTA' },
      { fechaResolucion: new Date().toISOString() },
      { fechaExtravio: null },
    ])
      await client()
        .patch(`/api/v1/alertas-extravio/${alerta.id}`)
        .set('Authorization', auth())
        .send(fields)
        .expect(400);
    const updated = await client()
      .patch(`/api/v1/alertas-extravio/${alerta.id}`)
      .set('Authorization', auth())
      .send({
        descripcion: null,
        fechaExtravio: '2020-01-02T12:00:00-04:00',
        latitud: 0,
        longitud: 0,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      mascotaId: mascota.id,
      estado: 'ACTIVA',
      fechaResolucion: null,
      fechaExtravio: '2020-01-02T16:00:00.000Z',
      latitud: 0,
      longitud: 0,
      descripcion: null,
    });
  });

  it('resolver registra fecha automaticamente, conserva historial y permite una alerta nueva', async () => {
    const mascota = await pet();
    const alerta = (await publish(mascota.id).expect(201))
      .body as AlertResponse;
    await client()
      .patch(`/api/v1/alertas-extravio/${alerta.id}/resolver`)
      .set('Authorization', auth())
      .send({ fechaResolucion: '2020-01-01T00:00:00Z' })
      .expect(400);
    const start = Date.now();
    const resolved = await client()
      .patch(`/api/v1/alertas-extravio/${alerta.id}/resolver`)
      .set('Authorization', auth())
      .expect(200);
    const body = resolved.body as AlertResponse;
    expect(body.estado).toBe(EstadoAlerta.RESUELTA);
    expect(Date.parse(body.fechaResolucion!)).toBeGreaterThanOrEqual(start);
    for (const suffix of ['', '/resolver', '/cancelar'])
      await client()
        .patch(`/api/v1/alertas-extravio/${alerta.id}${suffix}`)
        .set('Authorization', auth())
        .send({})
        .expect(409);
    await publish(mascota.id).expect(201);
    expect(
      await db.getRepository(AlertaExtravio).countBy({ mascotaId: mascota.id }),
    ).toBe(2);
    expect(
      await db
        .getRepository(AlertaExtravio)
        .countBy({ mascotaId: mascota.id, estado: EstadoAlerta.ACTIVA }),
    ).toBe(1);
  });

  it('cancelar conserva fila, no registra recuperacion ni permite transiciones terminales', async () => {
    const mascota = await pet();
    const alerta = (await publish(mascota.id).expect(201))
      .body as AlertResponse;
    const cancelled = await client()
      .patch(`/api/v1/alertas-extravio/${alerta.id}/cancelar`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    expect(cancelled.body).toMatchObject({
      estado: 'CANCELADA',
      fechaResolucion: null,
    });
    for (const suffix of ['', '/resolver', '/cancelar'])
      await client()
        .patch(`/api/v1/alertas-extravio/${alerta.id}${suffix}`)
        .set('Authorization', auth())
        .send({})
        .expect(409);
    await publish(mascota.id).expect(201);
    const ocultaPet = await pet();
    const oculta = (await publish(ocultaPet.id).expect(201))
      .body as AlertResponse;
    await db
      .getRepository(AlertaExtravio)
      .update(oculta.id, { estado: EstadoAlerta.OCULTA });
    for (const suffix of ['', '/resolver', '/cancelar'])
      await client()
        .patch(`/api/v1/alertas-extravio/${oculta.id}${suffix}`)
        .set('Authorization', auth())
        .send({})
        .expect(409);
  });

  it('serializa creaciones concurrentes y PostgreSQL protege el indice parcial', async () => {
    const mascota = await pet();
    const results = await Promise.all([
      publish(mascota.id),
      publish(mascota.id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db
        .getRepository(AlertaExtravio)
        .countBy({ mascotaId: mascota.id, estado: EstadoAlerta.ACTIVA }),
    ).toBe(1);
    await expect(
      db.getRepository(AlertaExtravio).save({
        mascotaId: mascota.id,
        fechaExtravio: new Date('2020-01-01'),
        latitud: 0,
        longitud: 0,
        estado: EstadoAlerta.ACTIVA,
      }),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
  });

  it('resolver y cancelar simultaneos producen un solo cierre consistente', async () => {
    const mascota = await pet();
    const alerta = (await publish(mascota.id).expect(201))
      .body as AlertResponse;
    const results = await Promise.all(
      ['/resolver', '/cancelar'].map((suffix) =>
        client()
          .patch(`/api/v1/alertas-extravio/${alerta.id}${suffix}`)
          .set('Authorization', auth())
          .send({}),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const stored = await db
      .getRepository(AlertaExtravio)
      .findOneByOrFail({ id: alerta.id });
    expect([EstadoAlerta.RESUELTA, EstadoAlerta.CANCELADA]).toContain(
      stored.estado,
    );
    expect(stored.fechaResolucion !== null).toBe(
      stored.estado === EstadoAlerta.RESUELTA,
    );
  });

  it('pagina listados con orden estable y mis-alertas no incluye otras mascotas', async () => {
    const all = (
      await client().get('/api/v1/alertas-extravio?limit=100').expect(200)
    ).body as AlertResponse[];
    const page = (
      await client()
        .get('/api/v1/alertas-extravio?limit=2&offset=1')
        .expect(200)
    ).body as AlertResponse[];
    expect(page.map((a) => a.id)).toEqual(all.slice(1, 3).map((a) => a.id));
    const own = await db.getRepository(Mascota).findBy({ usuarioId: users[1] });
    const ids = new Set(own.map((p) => p.id));
    const mine = (
      await client()
        .get('/api/v1/alertas-extravio/mis-alertas?limit=100')
        .set('Authorization', auth(1))
        .expect(200)
    ).body as AlertResponse[];
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((a) => ids.has(a.mascotaId))).toBe(true);
    const defaults = (
      await client().get('/api/v1/alertas-extravio').expect(200)
    ).body as AlertResponse[];
    expect(defaults.length).toBeLessThanOrEqual(10);
  });

  it('revierte solo la migracion nueva sin borrar mascotas', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const table = await runner.getTable(`${schema}.alerta_extravio`);
      expect(
        table?.columns.some((c) => ['usuario_id', 'radio_km'].includes(c.name)),
      ).toBe(false);
      await alertsMigration.down(runner);
      expect(await runner.hasTable(`${schema}.alerta_extravio`)).toBe(false);
      expect(await runner.hasTable(`${schema}.mascota`)).toBe(true);
    } finally {
      await runner.release();
    }
  });
});
