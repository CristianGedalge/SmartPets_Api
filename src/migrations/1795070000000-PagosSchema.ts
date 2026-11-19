import { MigrationInterface, QueryRunner } from 'typeorm';

export class PagosSchema1795070000000 implements MigrationInterface {
  name = 'PagosSchema1795070000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "pago" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "usuario_id" uuid NOT NULL,
      "plan_id" uuid NOT NULL,
      "suscripcion_id" uuid NOT NULL,
      "monto" numeric(10,2) NOT NULL,
      "moneda" varchar(3) NOT NULL DEFAULT 'BOB',
      "estado" varchar(20) NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_pago" PRIMARY KEY ("id"),
      CONSTRAINT "FK_pago_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_pago_plan" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT,
      CONSTRAINT "FK_pago_suscripcion" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripcion"("id") ON DELETE RESTRICT,
      CONSTRAINT "CHK_pago_monto" CHECK ("monto" > 0),
      CONSTRAINT "CHK_pago_estado" CHECK ("estado" IN ('PAGADO'))
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "pago"');
  }
}
