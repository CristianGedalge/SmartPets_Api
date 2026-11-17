import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../src/config/database.config';
import { ChatSchema1794960000000 } from '../src/migrations/1794960000000-ChatSchema';

const integration =
  process.env.SMARTPET_TEST_DATABASE === '1' ? describe : describe.skip;
integration('Modelo chat PostgreSQL', () => {
  let db: DataSource;
  const schema = `smartpet_test_${randomUUID().replaceAll('-', '')}`;
  const migration = new ChatSchema1794960000000();
  const alert = randomUUID(),
    sighting = randomUUID(),
    user = randomUUID();
  beforeAll(async () => {
    const config = databaseConfig();
    db = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.name,
      schema,
      extra: {
        options: `-c search_path=${schema},public`,
        connectionTimeoutMillis: 3000,
      },
      synchronize: false,
      entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.query(
      `CREATE FUNCTION "${schema}".uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT (substr(v,1,8) || '-' || substr(v,9,4) || '-4' || substr(v,14,3) || '-8' || substr(v,18,3) || '-' || substr(v,21,12))::uuid FROM (SELECT md5(random()::text || clock_timestamp()::text) AS v) s $$`,
    );
    // Minimal parent tables isolate chat constraints from existing business data.
    for (const table of ['usuario', 'alerta_extravio', 'avistamiento'])
      await db.query(`CREATE TABLE "${table}" (id uuid PRIMARY KEY)`);
    await db.query('INSERT INTO usuario(id) VALUES ($1)', [user]);
    await db.query('INSERT INTO alerta_extravio(id) VALUES ($1)', [alert]);
    await db.query('INSERT INTO avistamiento(id) VALUES ($1)', [sighting]);
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  }, 30000);
  afterAll(async () => {
    if (db?.isInitialized && /^smartpet_test_[a-f0-9]{32}$/.test(schema)) {
      await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.destroy();
    }
  });
  async function conversation() {
    const id = randomUUID();
    await db.query('INSERT INTO conversacion(id,alerta_id) VALUES ($1,$2)', [
      id,
      alert,
    ]);
    return id;
  }
  async function participant() {
    const chat = await conversation();
    const id = randomUUID();
    await db.query(
      'INSERT INTO participante_conversacion(id,conversacion_id,usuario_id) VALUES ($1,$2,$3)',
      [id, chat, user],
    );
    return { id, chat };
  }
  it('carga metadata TypeORM de las tres entidades y relaciones', () => {
    for (const name of ['Conversacion', 'ParticipanteConversacion', 'Mensaje'])
      expect(db.getMetadata(name).relations.length).toBeGreaterThan(0);
  });
  it('acepta contexto alerta o avistamiento, pero rechaza ambos o ninguno', async () => {
    await conversation();
    await db.query('INSERT INTO conversacion(avistamiento_id) VALUES ($1)', [
      sighting,
    ]);
    await expect(
      db.query('INSERT INTO conversacion DEFAULT VALUES'),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
    await expect(
      db.query(
        'INSERT INTO conversacion(alerta_id,avistamiento_id) VALUES ($1,$2)',
        [alert, sighting],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23514' } });
  });
  it('impide repetir al usuario y conserva lectura opcional', async () => {
    const p = await participant();
    await expect(
      db.query(
        'INSERT INTO participante_conversacion(conversacion_id,usuario_id) VALUES ($1,$2)',
        [p.chat, user],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
    const rows = await db.query<{ ultima_lectura_at: Date | null }[]>(
      'SELECT ultima_lectura_at FROM participante_conversacion WHERE id=$1',
      [p.id],
    );
    expect(rows[0].ultima_lectura_at).toBeNull();
    await db.query(
      'UPDATE participante_conversacion SET ultima_lectura_at=now() WHERE id=$1',
      [p.id],
    );
  });
  it.each(['', '   ', '\n\t', 'a'.repeat(4001)])(
    'rechaza mensaje vacío o demasiado largo %#',
    async (contenido) => {
      const p = await participant();
      await expect(
        db.query(
          'INSERT INTO mensaje(participante_id,contenido) VALUES ($1,$2)',
          [p.id, contenido],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
    },
  );
  it('acepta mensaje máximo y enlaza remitente con su conversación', async () => {
    const p = await participant();
    await db.query(
      'INSERT INTO mensaje(participante_id,contenido) VALUES ($1,$2)',
      [p.id, 'a'.repeat(4000)],
    );
    const rows = await db.query<
      { conversacion_id: string; usuario_id: string }[]
    >(
      'SELECT p.conversacion_id,p.usuario_id FROM mensaje m JOIN participante_conversacion p ON p.id=m.participante_id WHERE p.id=$1',
      [p.id],
    );
    expect(rows[0]).toEqual({ conversacion_id: p.chat, usuario_id: user });
  });
  it('rechaza referencias a contexto, usuario o participante inexistente', async () => {
    await expect(
      db.query('INSERT INTO conversacion(alerta_id) VALUES ($1)', [
        randomUUID(),
      ]),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    const chat = await conversation();
    await expect(
      db.query(
        'INSERT INTO participante_conversacion(conversacion_id,usuario_id) VALUES ($1,$2)',
        [chat, randomUUID()],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await expect(
      db.query(
        'INSERT INTO mensaje(participante_id,contenido) VALUES ($1,$2)',
        [randomUUID(), 'Hola'],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
  });
  it('protege usuario/publicación y elimina hijos solo al borrar conversación', async () => {
    const p = await participant();
    await db.query(
      'INSERT INTO mensaje(participante_id,contenido) VALUES ($1,$2)',
      [p.id, '¿Viste a mi mascota?'],
    );
    await expect(
      db.query('DELETE FROM usuario WHERE id=$1', [user]),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await expect(
      db.query('DELETE FROM alerta_extravio WHERE id=$1', [alert]),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await db.query('DELETE FROM conversacion WHERE id=$1', [p.chat]);
    expect(
      await db.query('SELECT id FROM participante_conversacion WHERE id=$1', [
        p.id,
      ]),
    ).toHaveLength(0);
    expect(
      await db.query('SELECT id FROM mensaje WHERE participante_id=$1', [p.id]),
    ).toHaveLength(0);
  });
  it('revierte y recrea tablas sin modificar las publicaciones ni usuarios', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      for (const table of [
        'mensaje',
        'participante_conversacion',
        'conversacion',
      ])
        expect(await runner.hasTable(`${schema}.${table}`)).toBe(false);
      for (const table of ['usuario', 'alerta_extravio', 'avistamiento'])
        expect(await runner.hasTable(`${schema}.${table}`)).toBe(true);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
  });
});
