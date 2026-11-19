import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimulatedCardPayment1795100000000 implements MigrationInterface {
  name = 'SimulatedCardPayment1795100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "pago" ADD "metodo_pago" varchar(30)');
    await queryRunner.query(
      'ALTER TABLE "pago" ADD "ultimos_cuatro" varchar(4)',
    );
    await queryRunner.query('ALTER TABLE "pago" ADD "referencia" varchar(50)');
    await queryRunner.query(`UPDATE "pago" SET
      "metodo_pago" = 'REGISTRO_ANTERIOR',
      "ultimos_cuatro" = '0000',
      "referencia" = 'ANT-' || replace("id"::text, '-', '')`);
    await queryRunner.query(
      'ALTER TABLE "pago" ALTER COLUMN "metodo_pago" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "pago" ALTER COLUMN "ultimos_cuatro" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "pago" ALTER COLUMN "referencia" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "pago" ADD CONSTRAINT "UQ_pago_referencia" UNIQUE ("referencia")',
    );
    await queryRunner.query(`UPDATE "plan"
      SET "descripcion" = 'Amplía tus búsquedas por foto y conversaciones con el agente SmartPet para acompañarte durante todo el mes.'
      WHERE "nombre" = 'Plus'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "plan"
      SET "descripcion" = 'Los mismos accesos, con un cupo mensual más alto.'
      WHERE "nombre" = 'Plus'`);
    await queryRunner.query(
      'ALTER TABLE "pago" DROP CONSTRAINT "UQ_pago_referencia"',
    );
    await queryRunner.query('ALTER TABLE "pago" DROP COLUMN "referencia"');
    await queryRunner.query('ALTER TABLE "pago" DROP COLUMN "ultimos_cuatro"');
    await queryRunner.query('ALTER TABLE "pago" DROP COLUMN "metodo_pago"');
  }
}
