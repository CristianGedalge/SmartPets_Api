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
integration('Analitica HTTP + PostgreSQL', () => {
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

  beforeEach(async () => {
    await db.query('DELETE FROM alerta_extravio');
    await db.query('DELETE FROM avistamiento');
    await db.query('DELETE FROM mascota');
    await db.query('UPDATE usuario SET estado = true');
  });

  const endpoint = '/api/v1/analitica/mapa-calor';
  const get = (query: object = {}, index = 0) =>
    client().get(endpoint).set('Authorization', auth(index)).query(query);
  type Result = {
    tipo: string;
    estado: string;
    totalReportes: number;
    datos: {
      type: string;
      features: {
        type: string;
        geometry: { type: string; coordinates: number[] };
        properties: { cantidad: number };
      }[];
    };
  };
  async function sight(extra: Partial<Avistamiento> = {}) {
    return db.getRepository(Avistamiento).save({
      usuarioId: users[3],
      especieId: 1,
      descripcion: 'Private description',
      direccion: 'Private address',
      fechaAvistamiento: new Date('2026-11-17T14:00:00Z'),
      latitud: -17.78311,
      longitud: -63.18211,
      ...extra,
    });
  }
  async function alert(extra: Partial<AlertaExtravio> = {}, petActive = true) {
    const pet = await db.getRepository(Mascota).save({
      usuarioId: users[3],
      especieId: 1,
      nombre: 'Private pet',
      estado: petActive,
    });
    return db.getRepository(AlertaExtravio).save({
      mascotaId: pet.id,
      descripcion: 'Private description',
      fechaExtravio: new Date('2026-11-17T14:00:00Z'),
      latitud: -17.78311,
      longitud: -63.18211,
      ...extra,
    });
  }

  it('solo ADMIN y ENCARGADO pueden consultar, sin requerir establecimiento', async () => {
    await client().get(endpoint).expect(401);
    await get({}, 3).expect(403);
    await get({}, 0).expect(200);
    await get({}, 2).expect(200);
    await db.getRepository(Usuario).update(users[0], { estado: false });
    await get({}, 0).expect(401);
  });

  it('agrupa ubicaciones y devuelve exclusivamente GeoJSON aproximado y cantidades', async () => {
    await sight();
    await sight({ latitud: -17.78312, longitud: -63.18212 });
    await sight({ latitud: -16.5, longitud: -68.15 });
    const result = (await get({ tipo: 'AVISTAMIENTOS' }).expect(200))
      .body as Result;
    expect(result.totalReportes).toBe(3);
    expect(result.estado).toBe('ACTIVO');
    expect(result.datos.features).toEqual([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-63.182, -17.783] },
        properties: { cantidad: 2 },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-68.15, -16.5] },
        properties: { cantidad: 1 },
      },
    ]);
    expect(Object.keys(result).sort()).toEqual([
      'datos',
      'desde',
      'estado',
      'hasta',
      'tipo',
      'totalReportes',
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /Private|usuario|mascota|descripcion|direccion|foto|email|telefono|storageKey/,
    );
  });

  it('filtra estados, usuarios inactivos y coordenadas fuera del mapa', async () => {
    await sight();
    await sight({ estado: 'CERRADO' as Avistamiento['estado'] });
    await sight({ estado: 'CANCELADO' as Avistamiento['estado'] });
    await sight({ latitud: 89 });
    await sight({ usuarioId: users[1] });
    await db.getRepository(Usuario).update(users[1], { estado: false });
    expect(
      ((await get({ tipo: 'AVISTAMIENTOS' }).expect(200)).body as Result)
        .totalReportes,
    ).toBe(1);
    expect(
      (
        (await get({ tipo: 'AVISTAMIENTOS', estado: 'TODOS' }).expect(200))
          .body as Result
      ).totalReportes,
    ).toBe(3);
    expect(
      (
        (await get({ tipo: 'AVISTAMIENTOS', estado: 'CERRADO' }).expect(200))
          .body as Result
      ).totalReportes,
    ).toBe(1);
  });

  it('nunca incluye alertas ocultas, mascotas ni propietarios desactivados', async () => {
    await alert();
    await alert({
      estado: 'RESUELTA' as AlertaExtravio['estado'],
      fechaResolucion: new Date('2026-11-18T12:00:00Z'),
    });
    await alert({ estado: 'CANCELADA' as AlertaExtravio['estado'] });
    await alert({ estado: 'OCULTA' as AlertaExtravio['estado'] });
    await alert({}, false);
    const otherPet = await db.getRepository(Mascota).save({
      usuarioId: users[1],
      especieId: 1,
      nombre: 'Other',
      estado: true,
    });
    await alert({ mascotaId: otherPet.id });
    await db.getRepository(Usuario).update(users[1], { estado: false });
    const active = (await get().expect(200)).body as Result;
    expect(active.tipo).toBe('ALERTAS');
    expect(active.estado).toBe('ACTIVA');
    expect(active.totalReportes).toBe(1);
    expect(
      ((await get({ estado: 'TODOS' }).expect(200)).body as Result)
        .totalReportes,
    ).toBe(3);
    expect(
      ((await get({ estado: 'RESUELTA' }).expect(200)).body as Result)
        .totalReportes,
    ).toBe(1);
  });

  it.each(['ALERTAS', 'AVISTAMIENTOS'])(
    'filtra fecha del evento %s con límites inclusivos de Bolivia',
    async (tipo) => {
      for (const time of [
        '2026-11-17T03:59:59Z',
        '2026-11-17T04:00:00Z',
        '2026-11-18T03:59:59Z',
        '2026-11-18T04:00:00Z',
      ]) {
        if (tipo === 'ALERTAS') await alert({ fechaExtravio: new Date(time) });
        else await sight({ fechaAvistamiento: new Date(time) });
      }
      expect(
        (
          (
            await get({
              tipo,
              desde: '2026-11-17',
              hasta: '2026-11-17',
            }).expect(200)
          ).body as Result
        ).totalReportes,
      ).toBe(2);
      expect(
        ((await get({ tipo, desde: '2026-11-18' }).expect(200)).body as Result)
          .totalReportes,
      ).toBe(1);
    },
  );

  it.each([
    { tipo: 'OTRO' },
    { estado: 'OCULTA' },
    { tipo: 'AVISTAMIENTOS', estado: 'ACTIVA' },
    { desde: '2026-02-30' },
    { desde: '2026-12-01', hasta: '2026-01-01' },
    { usuarioId: users[3] },
  ])('rechaza filtros inválidos %j', async (query) => {
    await get(query).expect(400);
  });

  it('devuelve una colección vacía válida', async () => {
    const result = (await get().expect(200)).body as Result;
    expect(result.totalReportes).toBe(0);
    expect(result.datos).toEqual({ type: 'FeatureCollection', features: [] });
  });
});
