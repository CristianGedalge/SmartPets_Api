import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertasExtravioSchema1794862800000 implements MigrationInterface {
  name = 'AlertasExtravioSchema1794862800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "alerta_extravio" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "mascota_id" uuid NOT NULL,
        "descripcion" text,
        "fecha_extravio" timestamptz NOT NULL,
        "latitud" numeric(10,8) NOT NULL,
        "longitud" numeric(11,8) NOT NULL,
        "estado" varchar(20) NOT NULL DEFAULT 'ACTIVA',
        "fecha_resolucion" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_alerta_mascota" FOREIGN KEY ("mascota_id") REFERENCES "mascota"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_alerta_estado" CHECK ("estado" IN ('ACTIVA', 'RESUELTA', 'CANCELADA', 'OCULTA')),
        CONSTRAINT "CK_alerta_latitud" CHECK ("latitud" BETWEEN -90 AND 90),
        CONSTRAINT "CK_alerta_longitud" CHECK ("longitud" BETWEEN -180 AND 180),
        CONSTRAINT "CK_alerta_resolucion" CHECK (("estado" = 'RESUELTA') = ("fecha_resolucion" IS NOT NULL))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_alerta_mascota_activa" ON "alerta_extravio" ("mascota_id") WHERE "estado" = 'ACTIVA'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerta_estado_fecha" ON "alerta_extravio" ("estado", "created_at" DESC, "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_alerta_mascota_historial" ON "alerta_extravio" ("mascota_id", "created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "alerta_extravio"`);
  }
}
