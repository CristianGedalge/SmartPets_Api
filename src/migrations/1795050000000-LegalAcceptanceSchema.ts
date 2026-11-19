import { MigrationInterface, QueryRunner } from 'typeorm';

export class LegalAcceptanceSchema1795050000000 implements MigrationInterface {
  name = 'LegalAcceptanceSchema1795050000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "aceptacion_legal" (
      "usuario_id" uuid PRIMARY KEY REFERENCES "usuario"("id") ON DELETE CASCADE,
      "version_terminos" varchar(40) NOT NULL,
      "version_privacidad" varchar(40) NOT NULL,
      "aceptado_en" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "aceptacion_legal"');
  }
}
