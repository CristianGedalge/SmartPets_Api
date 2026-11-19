import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerificationSchema1795090000000 implements MigrationInterface {
  name = 'EmailVerificationSchema1795090000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD "email_verificado" boolean NOT NULL DEFAULT false',
    );
    await queryRunner.query('UPDATE "usuario" SET "email_verificado" = true');
    await queryRunner.query(`CREATE TABLE "verificacion_email" (
      "usuario_id" uuid PRIMARY KEY REFERENCES "usuario"("id") ON DELETE CASCADE,
      "codigo_hash" varchar(128) NOT NULL,
      "salt" varchar(64) NOT NULL,
      "expira_en" timestamptz NOT NULL,
      "intentos" smallint NOT NULL DEFAULT 0,
      "enviado_en" timestamptz NOT NULL
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "verificacion_email"');
    await queryRunner.query(
      'ALTER TABLE "usuario" DROP COLUMN "email_verificado"',
    );
  }
}
