import { MigrationInterface, QueryRunner } from 'typeorm';
export class ResguardoAdopcionesSchema1794952800000 implements MigrationInterface {
  name = 'ResguardoAdopcionesSchema1794952800000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "animal_resguardado" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "mascota_id" uuid NOT NULL UNIQUE REFERENCES "mascota"("id") ON DELETE RESTRICT,
      "establecimiento_id" uuid NOT NULL REFERENCES "establecimiento"("id") ON DELETE RESTRICT,
      "estado" varchar(20) NOT NULL DEFAULT 'EN_RESGUARDO',
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CK_animal_resguardo_estado" CHECK ("estado" IN ('EN_RESGUARDO','ADOPTADO'))
    )`);
    await runner.query(
      `CREATE INDEX "IDX_resguardo_institucion" ON "animal_resguardado" ("establecimiento_id","created_at" DESC,"id")`,
    );
    await runner.query(`CREATE TABLE "publicacion_adopcion" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "animal_resguardado_id" uuid NOT NULL UNIQUE REFERENCES "animal_resguardado"("id") ON DELETE RESTRICT,
      "descripcion" text NOT NULL, "requisitos" text,
      "estado" varchar(20) NOT NULL DEFAULT 'PUBLICADA', "fecha_adopcion" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CK_publicacion_adopcion_estado" CHECK ("estado" IN ('PUBLICADA','RETIRADA','ADOPTADA')),
      CONSTRAINT "CK_publicacion_fecha_adopcion" CHECK (("estado" = 'ADOPTADA') = ("fecha_adopcion" IS NOT NULL))
    )`);
    await runner.query(
      `CREATE INDEX "IDX_adopcion_catalogo" ON "publicacion_adopcion" ("estado","created_at" DESC,"id")`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "publicacion_adopcion"');
    await runner.query('DROP TABLE "animal_resguardado"');
  }
}
