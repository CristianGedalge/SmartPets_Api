import * as bcrypt from 'bcrypt';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthSchema1700000000000 implements MigrationInterface {
  name = 'InitialAuthSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "rol" (
        "id" SERIAL NOT NULL,
        "nombre" character varying(30) NOT NULL,
        CONSTRAINT "UQ_rol_nombre" UNIQUE ("nombre"),
        CONSTRAINT "PK_rol_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "rol" ("nombre")
      VALUES ('ADMIN'), ('CIUDADANO'), ('ENCARGADO')
      ON CONFLICT ("nombre") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE "usuario" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "rol_id" integer NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "apellido" character varying(100) NOT NULL,
        "telefono" character varying(20),
        "foto_url" text,
        "email" character varying(150) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "estado" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_usuario_email" UNIQUE ("email"),
        CONSTRAINT "PK_usuario_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_usuario_rol" FOREIGN KEY ("rol_id")
          REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    const adminPasswordHash = await bcrypt.hash('Admin12345', 10);
    await queryRunner.query(
      `
      INSERT INTO "usuario" ("rol_id", "nombre", "apellido", "email", "password_hash", "estado")
      VALUES (
        (SELECT "id" FROM "rol" WHERE "nombre" = 'ADMIN'),
        'Admin',
        'SmartPet',
        'admin@smartpet.com',
        $1,
        true
      )
      ON CONFLICT ("email") DO NOTHING
    `,
      [adminPasswordHash],
    );

    await queryRunner.query(`
      CREATE TYPE "public"."establecimiento_tipo_enum" AS ENUM('VETERINARIA', 'REFUGIO')
    `);

    await queryRunner.query(`
      CREATE TABLE "establecimiento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "tipo" "public"."establecimiento_tipo_enum" NOT NULL,
        "descripcion" text,
        "direccion" character varying(255) NOT NULL,
        "latitud" numeric(10,8),
        "longitud" numeric(11,8),
        "telefono" character varying(20) NOT NULL,
        "horario_atencion" character varying(150),
        "estado" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_establecimiento_usuario_id" UNIQUE ("usuario_id"),
        CONSTRAINT "PK_establecimiento_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_establecimiento_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "establecimiento"`);
    await queryRunner.query(`DROP TYPE "public"."establecimiento_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TABLE "rol"`);
  }
}
