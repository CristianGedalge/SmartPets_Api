import { MigrationInterface, QueryRunner } from 'typeorm';

export class MascotasSchema1794859200000 implements MigrationInterface {
  name = 'MascotasSchema1794859200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "especie" (
        "id" SERIAL PRIMARY KEY,
        "nombre" varchar(100) NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(
      `INSERT INTO "especie" ("nombre") VALUES ('Perro'), ('Gato')`,
    );
    await queryRunner.query(`
      CREATE TABLE "mascota" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "especie_id" integer NOT NULL,
        "raza_nombre" varchar(100),
        "nombre" varchar(100) NOT NULL,
        "sexo" varchar(15),
        "color" varchar(100),
        "peso_kg" numeric(6,2),
        "edad_aproximada_meses" integer,
        "estado" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_mascota_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_mascota_especie" FOREIGN KEY ("especie_id") REFERENCES "especie"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_mascota_nombre" CHECK (length(trim("nombre")) > 0),
        CONSTRAINT "CK_mascota_sexo" CHECK ("sexo" IN ('MACHO', 'HEMBRA', 'DESCONOCIDO')),
        CONSTRAINT "CK_mascota_peso" CHECK ("peso_kg" > 0),
        CONSTRAINT "CK_mascota_edad" CHECK ("edad_aproximada_meses" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_mascota_usuario_estado" ON "mascota" ("usuario_id", "estado", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mascota_especie" ON "mascota" ("especie_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "foto_mascota" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "mascota_id" uuid NOT NULL,
        "url" text NOT NULL,
        "storage_key" varchar(500) NOT NULL UNIQUE,
        "proveedor" varchar(20) NOT NULL,
        "es_principal" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_foto_mascota" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_foto_mascota" ON "foto_mascota" ("mascota_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_foto_principal" ON "foto_mascota" ("mascota_id") WHERE "es_principal" = true`,
    );
    await queryRunner.query(`
      CREATE TABLE "archivo_pendiente_eliminacion" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "storage_key" varchar(500) NOT NULL UNIQUE,
        "disponible_desde" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_archivo_pendiente_fecha" ON "archivo_pendiente_eliminacion" ("disponible_desde")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "archivo_pendiente_eliminacion"`);
    await queryRunner.query(`DROP TABLE "foto_mascota"`);
    await queryRunner.query(`DROP TABLE "mascota"`);
    await queryRunner.query(`DROP TABLE "especie"`);
  }
}
