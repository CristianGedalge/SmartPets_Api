import { join } from 'path';
import { registerAs } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  name: process.env.DB_NAME ?? 'sw2_project',
}));

const db = databaseConfig();

// DataSource usado por el CLI de TypeORM para ejecutar/generar migraciones fuera de NestJS.
export default new DataSource({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.name,
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
