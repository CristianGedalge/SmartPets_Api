import { AceptacionLegal } from '../src/modules/auth/entities/aceptacion-legal.entity';
import { LegalAcceptanceSchema1795050000000 } from '../src/migrations/1795050000000-LegalAcceptanceSchema';
import { LEGAL_VERSION } from '../src/modules/auth/legal/legal-version';
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
import { Suscripcion } from '../src/modules/suscripciones/entities/suscripcion.entity';
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
integration('Aceptacion legal HTTP + PostgreSQL', () => {
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
        AceptacionLegal,
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
      await new LegalAcceptanceSchema1795050000000().up(runner);
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
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
  });

  const endpoint = '/api/v1/auth/register';
  const input = () => ({
    nombre: 'Ana',
    apellido: 'Prueba',
    email: `${randomUUID()}@example.com`,
    password: 'password123',
    aceptaTerminos: true,
    aceptaPrivacidad: true,
    versionLegal: LEGAL_VERSION,
  });

  it.each([
    { aceptaTerminos: undefined },
    { aceptaTerminos: false },
    { aceptaTerminos: 'true' },
    { aceptaPrivacidad: false },
    { aceptaPrivacidad: undefined },
    { versionLegal: 'anterior' },
  ])('la API rechaza omisiones y no crea la cuenta: %j', async (invalid) => {
    const data = { ...input(), ...invalid };
    await client().post(endpoint).send(data).expect(400);
    expect(
      await db.getRepository(Usuario).existsBy({ email: data.email }),
    ).toBe(false);
  });

  it('guarda aceptación y fecha del servidor junto al ciudadano, sin exponerla en login', async () => {
    const before = Date.now();
    const data = input();
    const response = await client().post(endpoint).send(data).expect(201);
    const body = response.body as { usuario: { id: string; rol: string } };
    expect(body.usuario.rol).toBe('CIUDADANO');
    const acceptance = await db
      .getRepository(AceptacionLegal)
      .findOneByOrFail({ usuarioId: body.usuario.id });
    expect(acceptance.versionTerminos).toBe(LEGAL_VERSION);
    expect(acceptance.versionPrivacidad).toBe(LEGAL_VERSION);
    expect(acceptance.aceptadoEn.getTime()).toBeGreaterThanOrEqual(
      before - 1000,
    );
    expect(acceptance.aceptadoEn.getTime()).toBeLessThanOrEqual(
      Date.now() + 1000,
    );
    const login = await client()
      .post('/api/v1/auth/login')
      .send({ email: data.email, password: data.password })
      .expect(200);
    expect(login.body).not.toHaveProperty('aceptacionLegal');
    expect(JSON.stringify(login.body)).not.toContain('versionTerminos');
  });

  it('también registra aceptación para encargado y no inventa historial previo', async () => {
    for (const id of users)
      expect(
        await db.getRepository(AceptacionLegal).existsBy({ usuarioId: id }),
      ).toBe(false);
    const response = await client()
      .post(endpoint)
      .send({
        ...input(),
        establecimiento: {
          nombre: 'Refugio',
          tipo: 'REFUGIO',
          direccion: 'Plaza',
          telefono: '70000000',
        },
      })
      .expect(201);
    const body = response.body as { usuario: { id: string; rol: string } };
    expect(body.usuario.rol).toBe('ENCARGADO');
    expect(
      await db
        .getRepository(AceptacionLegal)
        .existsBy({ usuarioId: body.usuario.id }),
    ).toBe(true);
    expect(
      await db
        .getRepository(Establecimiento)
        .existsBy({ usuarioId: body.usuario.id }),
    ).toBe(true);
  });

  it('no admite versiones o fechas de aceptación impuestas por el cliente', async () => {
    await client()
      .post(endpoint)
      .send({ ...input(), aceptadoEn: '2000-01-01' })
      .expect(400);
  });

  it('revierte cuenta y establecimiento si no se puede guardar la aceptación', async () => {
    const data = input();
    await db.query(
      "ALTER TABLE aceptacion_legal ADD CONSTRAINT legal_test_fail CHECK (version_terminos = 'blocked') NOT VALID",
    );
    try {
      await client()
        .post(endpoint)
        .send({
          ...data,
          establecimiento: {
            nombre: 'Refugio rollback',
            tipo: 'REFUGIO',
            direccion: 'Plaza',
            telefono: '70000000',
          },
        })
        .expect(500);
      expect(
        await db.getRepository(Usuario).existsBy({ email: data.email }),
      ).toBe(false);
      expect(
        await db
          .getRepository(Establecimiento)
          .existsBy({ nombre: 'Refugio rollback' }),
      ).toBe(false);
    } finally {
      await db.query(
        'ALTER TABLE aceptacion_legal DROP CONSTRAINT legal_test_fail',
      );
    }
  });
});
