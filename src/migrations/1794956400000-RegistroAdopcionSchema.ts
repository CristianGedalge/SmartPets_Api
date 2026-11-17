import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistroAdopcionSchema1794956400000 implements MigrationInterface {
  name = 'RegistroAdopcionSchema1794956400000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "adopcion" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "animal_resguardado_id" uuid NOT NULL UNIQUE REFERENCES "animal_resguardado"("id") ON DELETE RESTRICT,
      "nombre_adoptante" varchar(150) NOT NULL,
      "telefono_adoptante" varchar(20) NOT NULL,
      "fecha_adopcion" date NOT NULL,
      "observaciones" text,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "adopcion"');
  }
}
