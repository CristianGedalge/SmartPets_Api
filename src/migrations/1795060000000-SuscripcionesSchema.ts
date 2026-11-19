import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuscripcionesSchema1795060000000 implements MigrationInterface {
  name = 'SuscripcionesSchema1795060000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plan" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "nombre" varchar(50) NOT NULL,
      "descripcion" text,
      "precio_referencial" numeric(10,2) NOT NULL DEFAULT 0,
      "busquedas_foto_mes" integer,
      "mensajes_agente_mes" integer,
      "activo" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_plan" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_plan_nombre" UNIQUE ("nombre"),
      CONSTRAINT "CHK_plan_precio" CHECK ("precio_referencial" >= 0),
      CONSTRAINT "CHK_plan_busquedas" CHECK ("busquedas_foto_mes" IS NULL OR "busquedas_foto_mes" >= 0),
      CONSTRAINT "CHK_plan_mensajes" CHECK ("mensajes_agente_mes" IS NULL OR "mensajes_agente_mes" >= 0)
    )`);
    await queryRunner.query(`CREATE TABLE "suscripcion" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "usuario_id" uuid NOT NULL,
      "plan_id" uuid NOT NULL,
      "estado" varchar(20) NOT NULL,
      "inicio" timestamptz NOT NULL DEFAULT now(),
      "fin" timestamptz,
      "asignada_por" uuid,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_suscripcion" PRIMARY KEY ("id"),
      CONSTRAINT "FK_suscripcion_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_suscripcion_plan" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_suscripcion_admin" FOREIGN KEY ("asignada_por") REFERENCES "usuario"("id") ON DELETE SET NULL,
      CONSTRAINT "CHK_suscripcion_estado" CHECK ("estado" IN ('ACTIVA', 'VENCIDA', 'CANCELADA')),
      CONSTRAINT "CHK_suscripcion_fin" CHECK ("fin" IS NULL OR "fin" >= "inicio")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_suscripcion_activa" ON "suscripcion" ("usuario_id") WHERE "estado" = 'ACTIVA'`,
    );
    await queryRunner.query(`CREATE TABLE "consumo" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "usuario_id" uuid NOT NULL,
      "periodo" date NOT NULL,
      "busquedas_foto" integer NOT NULL DEFAULT 0,
      "mensajes_agente" integer NOT NULL DEFAULT 0,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_consumo" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_consumo_usuario_periodo" UNIQUE ("usuario_id", "periodo"),
      CONSTRAINT "FK_consumo_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE,
      CONSTRAINT "CHK_consumo_conteos" CHECK ("busquedas_foto" >= 0 AND "mensajes_agente" >= 0)
    )`);
    await queryRunner.query(`INSERT INTO "plan"
      ("nombre", "descripcion", "precio_referencial", "busquedas_foto_mes", "mensajes_agente_mes")
      VALUES
      ('Gratis', 'Uso de la app con un cupo mensual de búsqueda por foto y del agente.', 0, 5, 20),
      ('Plus', 'Los mismos accesos, con un cupo mensual más alto.', 29, 40, 200)`);
    await queryRunner.query(`INSERT INTO "suscripcion" ("usuario_id", "plan_id", "estado", "inicio")
      SELECT u."id", p."id", 'ACTIVA', now()
      FROM "usuario" u
      INNER JOIN "rol" r ON r."id" = u."rol_id"
      INNER JOIN "plan" p ON p."nombre" = 'Gratis'
      WHERE r."nombre" = 'CIUDADANO'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "consumo"');
    await queryRunner.query('DROP TABLE "suscripcion"');
    await queryRunner.query('DROP TABLE "plan"');
  }
}
