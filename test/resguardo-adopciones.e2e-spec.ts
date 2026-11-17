import { Adopcion } from '../src/modules/adopciones/entities/adopcion.entity';
import { AdopcionesService } from '../src/modules/adopciones/adopciones.service';
import { AnimalResguardado } from '../src/modules/resguardo/entities/animal-resguardado.entity';
import {
  EstadoAdopcion,
  PublicacionAdopcion,
} from '../src/modules/adopciones/entities/publicacion-adopcion.entity';
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
integration('Resguardo y adopciones HTTP + PostgreSQL', () => {
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
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1cAAAAASUVORK5CYII=',
    'base64',
  );
  const adoptionInput = {
    nombreAdoptante: 'Ana Perez',
    telefonoAdoptante: '70000001',
    fechaAdopcion: '2026-11-17',
    observaciones: 'Entrega realizada',
  };
  const client = () => request(app.getHttpServer());
  const auth = (index = 0) => `Bearer ${tokens[index]}`;
  const create = (index = 0, extra: Record<string, string> = {}) => {
    const req = client()
      .post('/api/v1/animales-resguardados')
      .set('Authorization', auth(index));
    for (const [k, v] of Object.entries({
      nombre: 'Luna',
      especieId: '1',
      ...extra,
    }))
      req.field(k, v);
    return req.attach('fotos', png, 'photo.png');
  };
  type Animal = {
    id: string;
    estado: string;
    establecimientoId: string;
    mascota: { id: string; nombre: string; fotos: { id: string }[] };
  };
  type Publication = {
    id: string;
    estado: string;
    fechaAdopcion: string | null;
    animalResguardadoId: string;
  };
  const publish = (id: string, index = 0) =>
    client().post('/api/v1/adopciones').set('Authorization', auth(index)).send({
      animalResguardadoId: id,
      descripcion: 'Busca un hogar',
      requisitos: 'Cuidado responsable',
    });
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

  it('solo ENCARGADO con establecimiento activo puede registrar y gestionar', async () => {
    await client().get('/api/v1/animales-resguardados').expect(401);
    await create(2).expect(403);
    await create(3).expect(403);
    for (let i = 0; i < 2; i++) {
      const animal = (await create(i).expect(201)).body as Animal;
      expect(animal.establecimientoId).toBe(institutions[i]);
      expect(animal.estado).toBe('EN_RESGUARDO');
      expect(animal.mascota.fotos).toHaveLength(1);
      await publish(animal.id, i).expect(201);
    }
  });
  it('impide elegir propietario/institucion y publicar mascotas personales', async () => {
    await create(0, { establecimientoId: institutions[1] }).expect(400);
    await create(0, { usuarioId: users[1] }).expect(400);
    await create(0, { estado: 'ADOPTADO' }).expect(400);
    const pet = await db.getRepository(Mascota).save({
      usuarioId: users[0],
      nombre: 'Personal',
      especieId: 1,
      estado: true,
    });
    await publish(pet.id).expect(404);
  });
  it('protege fichas/publicaciones ajenas, incluso frente a ADMIN', async () => {
    const animal = (await create().expect(201)).body as Animal;
    await client()
      .get(`/api/v1/animales-resguardados/${animal.id}`)
      .set('Authorization', auth(1))
      .expect(404);
    await client()
      .patch(`/api/v1/animales-resguardados/${animal.id}`)
      .set('Authorization', auth(1))
      .send({ nombre: 'Ajeno' })
      .expect(404);
    const publication = (await publish(animal.id).expect(201))
      .body as Publication;
    await client()
      .patch(`/api/v1/adopciones/${publication.id}/adoptar`)
      .set('Authorization', auth(1))
      .send(adoptionInput)
      .expect(404);
    await client()
      .patch(`/api/v1/adopciones/${publication.id}/retirar`)
      .set('Authorization', auth(2))
      .send({})
      .expect(403);
  });
  it('publicacion valida no expone datos personales y es unica por animal', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const results = await Promise.all([publish(animal.id), publish(animal.id)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const publication = results.find((r) => r.status === 201)!
      .body as Publication;
    const result = await client()
      .get(`/api/v1/adopciones/${publication.id}`)
      .expect(200);
    for (const secret of [
      'usuarioId',
      'passwordHash',
      'storageKey',
      'private0@example.com',
    ])
      expect(JSON.stringify(result.body)).not.toContain(secret);
    await client().get('/api/v1/adopciones?limit=10&offset=0').expect(200);
    await client()
      .get('/api/v1/adopciones/mis-publicaciones')
      .set('Authorization', auth())
      .expect(200);
  });
  it('edita ficha/fotos y mantiene al menos una', async () => {
    const animal = (await create().expect(201)).body as Animal;
    await client()
      .patch(`/api/v1/animales-resguardados/${animal.id}`)
      .set('Authorization', auth())
      .send({ nombre: 'Nueva Luna' })
      .expect(200);
    await client()
      .delete(
        `/api/v1/animales-resguardados/${animal.id}/fotos/${animal.mascota.fotos[0].id}`,
      )
      .set('Authorization', auth())
      .expect(400);
    const photos = (
      await client()
        .post(`/api/v1/animales-resguardados/${animal.id}/fotos`)
        .set('Authorization', auth())
        .attach('fotos', png, 'photo.png')
        .expect(201)
    ).body as Animal;
    expect(photos.mascota.fotos).toHaveLength(2);
    await client()
      .delete(
        `/api/v1/animales-resguardados/${animal.id}/fotos/${photos.mascota.fotos[0].id}`,
      )
      .set('Authorization', auth())
      .expect(200);
  });
  it('retira, edita y republica; adopcion es terminal y atomica', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    await client()
      .patch(`/api/v1/adopciones/${p.id}`)
      .set('Authorization', auth())
      .send({ descripcion: 'Texto actualizado' })
      .expect(200);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/retirar`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    await client().get(`/api/v1/adopciones/${p.id}`).expect(404);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/publicar`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    const adopted = (
      await client()
        .patch(`/api/v1/adopciones/${p.id}/adoptar`)
        .set('Authorization', auth())
        .send(adoptionInput)
        .expect(200)
    ).body as Publication;
    expect(adopted.estado).toBe('ADOPTADA');
    expect(adopted.fechaAdopcion).not.toBeNull();
    const custody = (
      await client()
        .get(`/api/v1/animales-resguardados/${animal.id}`)
        .set('Authorization', auth())
        .expect(200)
    ).body as Animal;
    expect(custody.estado).toBe('ADOPTADO');
    await client().get(`/api/v1/adopciones/${p.id}`).expect(404);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/publicar`)
      .set('Authorization', auth())
      .send({})
      .expect(409);
    await client()
      .patch(`/api/v1/animales-resguardados/${animal.id}`)
      .set('Authorization', auth())
      .send({ nombre: 'No' })
      .expect(409);
    await client()
      .patch(`/api/v1/mascotas/${animal.mascota.id}`)
      .set('Authorization', auth())
      .send({ nombre: 'No' })
      .expect(409);
  });
  it('rechaza datos y estados inyectados', async () => {
    const animal = (await create().expect(201)).body as Animal;
    await client()
      .post('/api/v1/adopciones')
      .set('Authorization', auth())
      .send({ animalResguardadoId: animal.id, descripcion: '  ' })
      .expect(400);
    const p = (await publish(animal.id).expect(201)).body as Publication;
    await client()
      .patch(`/api/v1/adopciones/${p.id}`)
      .set('Authorization', auth())
      .send({ descripcion: null })
      .expect(400);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/adoptar`)
      .set('Authorization', auth())
      .send({ estado: 'ADOPTADA' })
      .expect(400);
  });
  it('compensa la subida si la institucion se desactiva antes del registro atomico', async () => {
    const before = await db.getRepository(Mascota).count();
    upload.mockImplementationOnce(
      async (_file: unknown, storageKey: string) => {
        await db
          .getRepository(Establecimiento)
          .update(institutions[0], { estado: false });
        return { storageKey, url: `https://images.test/${storageKey}.png` };
      },
    );
    await create().expect(403);
    expect(await db.getRepository(Mascota).count()).toBe(before);
    expect(await db.getRepository(ArchivoPendiente).count()).toBeGreaterThan(0);
    await db
      .getRepository(Establecimiento)
      .update(institutions[0], { estado: true });
  });
  it('serializa retiro y adopcion simultaneos sin estados inconsistentes', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    const results = await Promise.all(
      ['retirar', 'adoptar'].map((action) =>
        client()
          .patch(`/api/v1/adopciones/${p.id}/${action}`)
          .set('Authorization', auth())
          .send(action === 'adoptar' ? adoptionInput : {}),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const stored = await db
      .getRepository(PublicacionAdopcion)
      .findOneByOrFail({ id: p.id });
    const custody = await db
      .getRepository(AnimalResguardado)
      .findOneByOrFail({ id: animal.id });
    expect(custody.estado).toBe(
      stored.estado === EstadoAdopcion.ADOPTADA ? 'ADOPTADO' : 'EN_RESGUARDO',
    );
    expect(stored.fechaAdopcion != null).toBe(
      stored.estado === EstadoAdopcion.ADOPTADA,
    );
  });
  it('registra una sola entrega concurrente y conserva datos solo en la lectura privada propia', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    const results = await Promise.all(
      [0, 1].map(() =>
        client()
          .patch(`/api/v1/adopciones/${p.id}/adoptar`)
          .set('Authorization', auth())
          .send(adoptionInput),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      await db
        .getRepository(Adopcion)
        .countBy({ animalResguardadoId: animal.id }),
    ).toBe(1);
    const saved = results.find((r) => r.status === 200)!.body as {
      registroAdopcion: Record<string, unknown>;
    };
    expect(saved.registroAdopcion).toMatchObject(adoptionInput);
    expect(saved.registroAdopcion).not.toHaveProperty('encargadoId');
    const mine = await client()
      .get('/api/v1/adopciones/mis-publicaciones?limit=100')
      .set('Authorization', auth())
      .expect(200);
    expect(JSON.stringify(mine.body)).toContain('Ana Perez');
    const other = await client()
      .get('/api/v1/adopciones/mis-publicaciones?limit=100')
      .set('Authorization', auth(1))
      .expect(200);
    expect(JSON.stringify(other.body)).not.toContain('Ana Perez');
    const catalog = await client()
      .get('/api/v1/adopciones?limit=100')
      .expect(200);
    for (const field of [
      'registroAdopcion',
      'nombreAdoptante',
      'telefonoAdoptante',
      'observaciones',
      'Ana Perez',
    ])
      expect(JSON.stringify(catalog.body)).not.toContain(field);
    await client().get(`/api/v1/adopciones/${p.id}`).expect(404);
  });
  it('rechaza entrega incompleta sin cambiar estado ni crear registros', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    for (const body of [
      {},
      { ...adoptionInput, fechaAdopcion: '2026-02-30' },
      { ...adoptionInput, nombreAdoptante: ' ' },
    ])
      await client()
        .patch(`/api/v1/adopciones/${p.id}/adoptar`)
        .set('Authorization', auth())
        .send(body)
        .expect(400);
    expect(
      await db
        .getRepository(Adopcion)
        .countBy({ animalResguardadoId: animal.id }),
    ).toBe(0);
    expect(
      (
        await db
          .getRepository(PublicacionAdopcion)
          .findOneByOrFail({ id: p.id })
      ).estado,
    ).toBe('PUBLICADA');
    await client().get(`/api/v1/adopciones/${p.id}`).expect(200);
  });
  it('revierte registro y animal si falla la escritura final de la publicacion', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    // Constraint scoped to this disposable schema and publication forces a real database failure.
    await db.query(
      `ALTER TABLE publicacion_adopcion ADD CONSTRAINT test_adoption_rollback CHECK (id <> '${p.id}' OR estado <> 'ADOPTADA')`,
    );
    try {
      await expect(
        app.get(AdopcionesService).adopt(users[0], p.id, adoptionInput),
      ).rejects.toThrow();
    } finally {
      await db.query(
        'ALTER TABLE publicacion_adopcion DROP CONSTRAINT test_adoption_rollback',
      );
    }
    expect(
      await db
        .getRepository(Adopcion)
        .countBy({ animalResguardadoId: animal.id }),
    ).toBe(0);
    expect(
      (
        await db
          .getRepository(AnimalResguardado)
          .findOneByOrFail({ id: animal.id })
      ).estado,
    ).toBe('EN_RESGUARDO');
    expect(
      (
        await db
          .getRepository(PublicacionAdopcion)
          .findOneByOrFail({ id: p.id })
      ).estado,
    ).toBe('PUBLICADA');
  });
  it('adoptar exige sesión de encargado y publicación disponible', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    await client()
      .patch(`/api/v1/adopciones/${p.id}/adoptar`)
      .send(adoptionInput)
      .expect(401);
    for (const index of [2, 3])
      await client()
        .patch(`/api/v1/adopciones/${p.id}/adoptar`)
        .set('Authorization', auth(index))
        .send(adoptionInput)
        .expect(403);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/retirar`)
      .set('Authorization', auth())
      .send({})
      .expect(200);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/adoptar`)
      .set('Authorization', auth())
      .send(adoptionInput)
      .expect(409);
    expect(
      await db
        .getRepository(Adopcion)
        .countBy({ animalResguardadoId: animal.id }),
    ).toBe(0);
  });
  it('lee entregas históricas sin inventar un adoptante', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    await db
      .getRepository(AnimalResguardado)
      .update(animal.id, { estado: 'ADOPTADO' as AnimalResguardado['estado'] });
    await db.getRepository(PublicacionAdopcion).update(p.id, {
      estado: EstadoAdopcion.ADOPTADA,
      fechaAdopcion: new Date('2026-11-16T00:00:00Z'),
    });
    const mine = await client()
      .get('/api/v1/adopciones/mis-publicaciones?limit=100')
      .set('Authorization', auth())
      .expect(200);
    const items = mine.body as { id: string; registroAdopcion: unknown }[];
    expect(items.find((item) => item.id === p.id)?.registroAdopcion).toBeNull();
  });
  it('oculta catalogo al desactivar mascota o institucion y bloquea gestion', async () => {
    const animal = (await create().expect(201)).body as Animal;
    const p = (await publish(animal.id).expect(201)).body as Publication;
    await db
      .getRepository(Mascota)
      .update(animal.mascota.id, { estado: false });
    await client().get(`/api/v1/adopciones/${p.id}`).expect(404);
    await db.getRepository(Mascota).update(animal.mascota.id, { estado: true });
    await db
      .getRepository(Establecimiento)
      .update(institutions[0], { estado: false });
    await client().get(`/api/v1/adopciones/${p.id}`).expect(404);
    await create().expect(403);
    await client()
      .patch(`/api/v1/adopciones/${p.id}/adoptar`)
      .set('Authorization', auth())
      .send(adoptionInput)
      .expect(403);
    await db
      .getRepository(Establecimiento)
      .update(institutions[0], { estado: true });
  });
});
