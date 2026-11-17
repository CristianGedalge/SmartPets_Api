import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatSchema1794960000000 implements MigrationInterface {
  name = 'ChatSchema1794960000000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "conversacion" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "alerta_id" uuid REFERENCES "alerta_extravio"("id") ON DELETE RESTRICT,
      "avistamiento_id" uuid REFERENCES "avistamiento"("id") ON DELETE RESTRICT,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CK_conversacion_contexto" CHECK (("alerta_id" IS NOT NULL) <> ("avistamiento_id" IS NOT NULL))
    )`);
    await runner.query(
      'CREATE INDEX "IDX_conversacion_alerta" ON "conversacion" ("alerta_id") WHERE "alerta_id" IS NOT NULL',
    );
    await runner.query(
      'CREATE INDEX "IDX_conversacion_avistamiento" ON "conversacion" ("avistamiento_id") WHERE "avistamiento_id" IS NOT NULL',
    );
    await runner.query(`CREATE TABLE "participante_conversacion" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "conversacion_id" uuid NOT NULL REFERENCES "conversacion"("id") ON DELETE CASCADE,
      "usuario_id" uuid NOT NULL REFERENCES "usuario"("id") ON DELETE RESTRICT,
      "ultima_lectura_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_participante_conversacion_usuario" UNIQUE ("conversacion_id","usuario_id")
    )`);
    await runner.query(
      'CREATE INDEX "IDX_participante_bandeja" ON "participante_conversacion" ("usuario_id","conversacion_id")',
    );
    await runner.query(`CREATE TABLE "mensaje" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      "participante_id" uuid NOT NULL REFERENCES "participante_conversacion"("id") ON DELETE CASCADE,
      "contenido" text NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CK_mensaje_contenido" CHECK (char_length("contenido") <= 4000 AND "contenido" ~ '[^[:space:]]')
    )`);
    await runner.query(
      'CREATE INDEX "IDX_mensaje_historial" ON "mensaje" ("participante_id","created_at","id")',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "mensaje"');
    await runner.query('DROP TABLE "participante_conversacion"');
    await runner.query('DROP TABLE "conversacion"');
  }
}
