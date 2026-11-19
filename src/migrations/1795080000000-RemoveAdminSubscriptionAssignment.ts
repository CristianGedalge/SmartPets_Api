import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAdminSubscriptionAssignment1795080000000 implements MigrationInterface {
  name = 'RemoveAdminSubscriptionAssignment1795080000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "suscripcion"
      SET "estado" = 'CANCELADA', "updated_at" = now()
      WHERE "estado" = 'ACTIVA' AND "asignada_por" IS NOT NULL`);
    await queryRunner.query(
      'ALTER TABLE "suscripcion" DROP CONSTRAINT "FK_suscripcion_admin"',
    );
    await queryRunner.query(
      'ALTER TABLE "suscripcion" DROP COLUMN "asignada_por"',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "suscripcion" ADD "asignada_por" uuid',
    );
    await queryRunner.query(`ALTER TABLE "suscripcion"
      ADD CONSTRAINT "FK_suscripcion_admin"
      FOREIGN KEY ("asignada_por") REFERENCES "usuario"("id") ON DELETE SET NULL`);
  }
}
