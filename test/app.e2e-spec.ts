import { Adopcion } from '../src/modules/adopciones/entities/adopcion.entity';
import { RegistroAdopcionSchema1794956400000 } from '../src/migrations/1794956400000-RegistroAdopcionSchema';
import { ResguardoAdopcionesSchema1794952800000 } from '../src/migrations/1794952800000-ResguardoAdopcionesSchema';
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
import { Establecimiento } from '../src/modules/establecimientos/entities/establecimiento.entity';
import { Especie } from '../src/modules/especies/entities/especie.entity';
import { Mascota } from '../src/modules/mascotas/entities/mascota.entity';
import { FotoMascota } from '../src/modules/mascotas/entities/foto-mascota.entity';
import { ArchivoPendiente } from '../src/modules/almacenamiento/entities/archivo-pendiente.entity';
import { CloudinaryService } from '../src/modules/almacenamiento/cloudinary.service';
import { LimpiezaArchivosService } from '../src/modules/almacenamiento/limpieza-archivos.service';
import { MascotasSchema1794859200000 } from '../src/migrations/1794859200000-MascotasSchema';
import { AlertaExtravio } from '../src/modules/alertas-extravio/entities/alerta-extravio.entity';
import { AlertasExtravioSchema1794862800000 } from '../src/migrations/1794862800000-AlertasExtravioSchema';

// Opt-in: real PostgreSQL, isolated disposable schema, mocked Cloudinary only.
const integration =
  process.env.SMARTPET_TEST_DATABASE === '1' ? describe : describe.skip;
integration('Mascotas HTTP + JWT + PostgreSQL', () => {
  let app: INestApplication<App>;
  let db: DataSource;
  let cleanup: LimpiezaArchivosService;
  const schema = `smartpet_test_${randomUUID().replaceAll('-', '')}`;
  const migration = new MascotasSchema1794859200000();
  const alertsMigration = new AlertasExtravioSchema1794862800000();
  const users = [randomUUID(), randomUUID(), randomUUID()];
  const roles = [RolNombre.CIUDADANO, RolNombre.ENCARGADO, RolNombre.ADMIN];
  const tokens: string[] = [];
  const remote = new Set<string>();
  const upload = jest.fn((_file: unknown, storageKey: string) => {
    remote.add(storageKey);
    return Promise.resolve({
      storageKey,
      url: `https://images.test/${storageKey}.png`,
    });
  });
  const destroy = jest.fn((storageKey: string) => {
    remote.delete(storageKey);
    return Promise.resolve();
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=',
    'base64',
  );
  const client = () => request(app.getHttpServer());
  const auth = (index = 0) => `Bearer ${tokens[index]}`;
  const create = (index = 0, photos = 1) => {
    let req = client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth(index))
      .field('nombre', 'Luna')
      .field('especieId', '1')
      .field('pesoKg', '4.25')
      .field('edadAproximadaMeses', '0');
    for (let i = 0; i < photos; i++)
      req = req.attach('fotos', png, {
        filename: `foto${i}.png`,
        contentType: 'image/png',
      });
    return req;
  };
  type Pet = {
    id: string;
    estado: boolean;
    usuarioId: string;
    pesoKg: number;
    fotos: { id: string; storageKey: string; esPrincipal: boolean }[];
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
      ],
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    // Test-only UUID generator: no extensions or public schema changes.
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
      await migration.up(runner);
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
      await db.getRepository(Rol).save({ id: i + 1, nombre: roles[i] });
      await db.getRepository(Usuario).save({
        id: users[i],
        rolId: i + 1,
        nombre: 'Prueba',
        apellido: 'Aislada',
        email: `test${i}@example.com`,
        passwordHash: 'not-used',
        estado: true,
      });
    }
    cleanup = new LimpiezaArchivosService(db, {
      destroy,
    } as unknown as CloudinaryService);
    jest.spyOn(cleanup, 'onModuleInit').mockImplementation(() => undefined);
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
      .overrideProvider(LimpiezaArchivosService)
      .useValue(cleanup)
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
          email: `test${i}@example.com`,
          rol: roles[i],
        }),
      );
  }, 30000);

  afterAll(async () => {
    // App.close destroys its overridden DataSource; drop only this generated schema first.
    if (db?.isInitialized && /^smartpet_test_[a-f0-9]{32}$/.test(schema)) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
  });

  it('aplica JWT, lista especies y admite los tres roles sin acceso global de admin', async () => {
    await client().get('/api/v1/especies').expect(401);
    const especies = await client()
      .get('/api/v1/especies')
      .set('Authorization', auth())
      .expect(200);
    expect(especies.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nombre: 'Perro' }),
        expect.objectContaining({ nombre: 'Gato' }),
      ]),
    );
    for (let i = 0; i < users.length; i++) {
      const response = await create(i).expect(201);
      const pet = response.body as Pet;
      expect(pet.usuarioId).toBe(users[i]);
      expect(pet.pesoKg).toBe(4.25);
      expect(pet.fotos.filter((photo) => photo.esPrincipal)).toHaveLength(1);
      await client()
        .get(`/api/v1/mascotas/${pet.id}`)
        .set('Authorization', auth((i + 1) % 3))
        .expect(404);
    }
    await db.getRepository(Usuario).update(users[2], { estado: false });
    await client()
      .get('/api/v1/mascotas/mis-mascotas')
      .set('Authorization', auth(2))
      .expect(401);
    await db.getRepository(Usuario).update(users[2], { estado: true });
  });

  it('rechaza datos y fotos inválidos antes de contactar Cloudinary', async () => {
    const before = upload.mock.calls.length;
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 1)
      .expect(400);
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 1)
      .field('usuarioId', users[1])
      .attach('fotos', png, 'foto.png')
      .expect(400);
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 999)
      .attach('fotos', png, 'foto.png')
      .expect(400);
    await create(0, 6).expect(400);
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 1)
      .attach('fotos', Buffer.from('fake png'), {
        filename: 'f.png',
        contentType: 'image/png',
      })
      .expect(400);
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 1)
      .attach('fotos', Buffer.from('<svg/>'), {
        filename: 'f.svg',
        contentType: 'image/svg+xml',
      })
      .expect(400);
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Luna')
      .field('especieId', 1)
      .attach('fotos', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'big.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(upload.mock.calls).toHaveLength(before);
  });

  it('protege datos y fotos ajenos; PATCH solo actualiza datos; baja lógica conserva fotos', async () => {
    const response = await create().expect(201);
    const pet = response.body as Pet;
    const before = upload.mock.calls.length;
    await client()
      .patch(`/api/v1/mascotas/${pet.id}`)
      .set('Authorization', auth(1))
      .send({ nombre: 'Ajena' })
      .expect(404);
    await client()
      .delete(`/api/v1/mascotas/${pet.id}`)
      .set('Authorization', auth(1))
      .expect(404);
    await client()
      .post(`/api/v1/mascotas/${pet.id}/fotos`)
      .set('Authorization', auth(1))
      .attach('fotos', png, 'f.png')
      .expect(404);
    await client()
      .delete(`/api/v1/mascotas/${pet.id}/fotos/${pet.fotos[0].id}`)
      .set('Authorization', auth(1))
      .expect(404);
    expect(upload.mock.calls).toHaveLength(before);
    await client()
      .patch(`/api/v1/mascotas/${pet.id}`)
      .set('Authorization', auth())
      .send({ fotos: [], estado: false })
      .expect(400);
    await client()
      .patch(`/api/v1/mascotas/${pet.id}`)
      .set('Authorization', auth())
      .send({
        nombre: 'Sol',
        razaNombre: 'Mestizo',
        color: null,
        edadAproximadaMeses: 0,
      })
      .expect(200);
    const list = await client()
      .get('/api/v1/mascotas/mis-mascotas?limit=100&offset=0')
      .set('Authorization', auth())
      .expect(200);
    expect(
      (list.body as Pet[]).every((item) => item.usuarioId === users[0]),
    ).toBe(true);
    expect(
      (
        await client()
          .delete(`/api/v1/mascotas/${pet.id}`)
          .set('Authorization', auth())
          .expect(200)
      ).body,
    ).toMatchObject({ estado: false });
    await client()
      .get(`/api/v1/mascotas/${pet.id}`)
      .set('Authorization', auth())
      .expect(404);
    await client()
      .post(`/api/v1/mascotas/${pet.id}/fotos`)
      .set('Authorization', auth())
      .attach('fotos', png, 'f.png')
      .expect(404);
    expect(
      await db.getRepository(Mascota).findOneBy({ id: pet.id }),
    ).toMatchObject({ estado: false });
    expect(
      await db.getRepository(FotoMascota).countBy({ mascotaId: pet.id }),
    ).toBe(1);
  });

  it('serializa altas concurrentes: una sola alcanza cinco, nunca seis', async () => {
    const response = await create(0, 4).expect(201);
    const pet = response.body as Pet;
    const add = () =>
      client()
        .post(`/api/v1/mascotas/${pet.id}/fotos`)
        .set('Authorization', auth())
        .attach('fotos', png, 'f.png');
    const results = await Promise.all([add(), add()]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 400]);
    expect(
      await db.getRepository(FotoMascota).countBy({ mascotaId: pet.id }),
    ).toBe(5);
    expect(
      await db
        .getRepository(FotoMascota)
        .countBy({ mascotaId: pet.id, esPrincipal: true }),
    ).toBe(1);
    const count = upload.mock.calls.length;
    await add().expect(400);
    expect(upload.mock.calls).toHaveLength(count);
  });

  it('al borrar principal promueve otra, persiste reintentos y conserva la última foto', async () => {
    const response = await create(0, 2).expect(201);
    const pet = response.body as Pet;
    const main = pet.fotos.find((photo) => photo.esPrincipal)!;
    destroy.mockRejectedValueOnce(new Error('Cloudinary offline'));
    const removed = await client()
      .delete(`/api/v1/mascotas/${pet.id}/fotos/${main.id}`)
      .set('Authorization', auth())
      .expect(200);
    expect(removed.body).toMatchObject({
      eliminada: true,
      limpiezaPendiente: true,
    });
    const pending = await db
      .getRepository(ArchivoPendiente)
      .findOneByOrFail({ storageKey: main.storageKey });
    expect(
      await db
        .getRepository(FotoMascota)
        .countBy({ mascotaId: pet.id, esPrincipal: true }),
    ).toBe(1);
    await db
      .getRepository(ArchivoPendiente)
      .update(pending.id, { disponibleDesde: new Date(0) });
    expect(await cleanup.processOne(pending.id)).toBe(true);
    expect(remote.has(main.storageKey)).toBe(false);
    const last = await db
      .getRepository(FotoMascota)
      .findOneByOrFail({ mascotaId: pet.id });
    await client()
      .delete(`/api/v1/mascotas/${pet.id}/fotos/${last.id}`)
      .set('Authorization', auth())
      .expect(400);
    await client()
      .delete(`/api/v1/mascotas/${pet.id}/fotos/${main.id}`)
      .set('Authorization', auth())
      .expect(404);
  });

  it('subida parcial fallida no crea mascota y mantiene compensaciones tras reiniciar el worker', async () => {
    const petsBefore = await db.getRepository(Mascota).count();
    const pendingBefore = await db.getRepository(ArchivoPendiente).count();
    upload
      .mockImplementationOnce((_file, storageKey) => {
        remote.add(storageKey);
        return Promise.resolve({
          storageKey,
          url: `https://images.test/${storageKey}.png`,
        });
      })
      .mockRejectedValueOnce(
        new (await import('@nestjs/common')).ServiceUnavailableException(
          'Fallo simulado',
        ),
      );
    await create(0, 2).expect(503);
    expect(await db.getRepository(Mascota).count()).toBe(petsBefore);
    expect(await db.getRepository(ArchivoPendiente).count()).toBe(
      pendingBefore + 2,
    );
    const pending = await db.getRepository(ArchivoPendiente).find();
    const restartedWorker = new LimpiezaArchivosService(db, {
      destroy,
    } as unknown as CloudinaryService);
    for (const task of pending) {
      await db
        .getRepository(ArchivoPendiente)
        .update(task.id, { disponibleDesde: new Date(0) });
      expect(await restartedWorker.processOne(task.id)).toBe(true);
      expect(remote.has(task.storageKey)).toBe(false);
    }
  });

  it('un fallo SQL tras subir conserva la intención para compensar el archivo remoto', async () => {
    const especie = await db
      .getRepository(Especie)
      .save({ nombre: 'Especie temporal' });
    const before = await db.getRepository(Mascota).count();
    let uploadedKey = '';
    upload.mockImplementationOnce(async (_file, storageKey) => {
      uploadedKey = storageKey;
      remote.add(storageKey);
      // Simulate the species disappearing after validation but before the FK insert.
      await db.getRepository(Especie).delete(especie.id);
      return { storageKey, url: `https://images.test/${storageKey}.png` };
    });
    await client()
      .post('/api/v1/mascotas')
      .set('Authorization', auth())
      .field('nombre', 'Fallo SQL')
      .field('especieId', especie.id)
      .attach('fotos', png, 'f.png')
      .expect(400);
    expect(await db.getRepository(Mascota).count()).toBe(before);
    const task = await db
      .getRepository(ArchivoPendiente)
      .findOneByOrFail({ storageKey: uploadedKey });
    expect(
      await db.getRepository(FotoMascota).countBy({ storageKey: uploadedKey }),
    ).toBe(0);
    await db
      .getRepository(ArchivoPendiente)
      .update(task.id, { disponibleDesde: new Date(0) });
    expect(await cleanup.processOne(task.id)).toBe(true);
    expect(remote.has(uploadedKey)).toBe(false);
  });

  it('valida pertenencia de foto a mascota y confirma un borrado remoto exitoso', async () => {
    const firstResponse = await create(0, 2).expect(201);
    const secondResponse = await create(0).expect(201);
    const first = firstResponse.body as Pet;
    const second = secondResponse.body as Pet;
    const before = destroy.mock.calls.length;
    await client()
      .delete(`/api/v1/mascotas/${first.id}/fotos/${second.fotos[0].id}`)
      .set('Authorization', auth())
      .expect(404);
    expect(destroy.mock.calls).toHaveLength(before);
    const photo = first.fotos[0];
    const deleted = await client()
      .delete(`/api/v1/mascotas/${first.id}/fotos/${photo.id}`)
      .set('Authorization', auth())
      .expect(200);
    expect(deleted.body).toMatchObject({
      eliminada: true,
      limpiezaPendiente: false,
    });
    expect(await db.getRepository(FotoMascota).countBy({ id: photo.id })).toBe(
      0,
    );
    expect(remote.has(photo.storageKey)).toBe(false);
  });

  it('revierte la nueva migración sin tocar las tablas existentes', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new RegistroAdopcionSchema1794956400000().down(runner);
      await new ResguardoAdopcionesSchema1794952800000().down(runner);
      await new AvistamientosSchema1794945600000().down(runner);
      await alertsMigration.down(runner);
      await migration.down(runner);
      expect(await runner.hasTable(`${schema}.usuario`)).toBe(true);
      expect(await runner.hasTable(`${schema}.mascota`)).toBe(false);
    } finally {
      await runner.release();
    }
  });
});
