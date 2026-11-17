import { MigrationInterface, QueryRunner } from 'typeorm';
export class AvistamientosSchema1794945600000 implements MigrationInterface {
  name = 'AvistamientosSchema1794945600000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "avistamiento" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "usuario_id" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT,
      "especie_id" integer NOT NULL REFERENCES "especie"("id") ON DELETE RESTRICT,
      "descripcion" text NOT NULL, "direccion" varchar(255) NOT NULL,
      "fecha_avistamiento" timestamptz NOT NULL,
      "latitud" numeric(10,8) NOT NULL, "longitud" numeric(11,8) NOT NULL,
      "estado" varchar(20) NOT NULL DEFAULT 'ACTIVO',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CK_avistamiento_estado" CHECK ("estado" IN ('ACTIVO','CERRADO','CANCELADO')),
      CONSTRAINT "CK_avistamiento_latitud" CHECK ("latitud" BETWEEN -90 AND 90),
      CONSTRAINT "CK_avistamiento_longitud" CHECK ("longitud" BETWEEN -180 AND 180)
    )`);
    await runner.query(
      `CREATE INDEX "IDX_avistamiento_publico" ON "avistamiento" ("estado","created_at" DESC,"id")`,
    );
    await runner.query(
      `CREATE INDEX "IDX_avistamiento_propios" ON "avistamiento" ("usuario_id","created_at" DESC,"id")`,
    );
    await runner.query(`CREATE TABLE "avistamiento_foto" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "avistamiento_id" uuid NOT NULL REFERENCES "avistamiento"("id") ON DELETE CASCADE,
      "url" text NOT NULL, "storage_key" varchar(500) NOT NULL UNIQUE,
      "proveedor" varchar(20) NOT NULL, "es_principal" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(
      `CREATE INDEX "IDX_avistamiento_foto_parent" ON "avistamiento_foto" ("avistamiento_id")`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX "UQ_avistamiento_foto_principal" ON "avistamiento_foto" ("avistamiento_id") WHERE "es_principal" = true`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "avistamiento_foto"');
    await runner.query('DROP TABLE "avistamiento"');
  }
}
