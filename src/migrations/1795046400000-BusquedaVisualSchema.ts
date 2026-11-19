import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusquedaVisualSchema1795046400000 implements MigrationInterface {
  name = 'BusquedaVisualSchema1795046400000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "avistamiento_embedding" (
      "foto_id" uuid NOT NULL REFERENCES "avistamiento_foto"("id") ON DELETE CASCADE,
      "modelo" varchar(100) NOT NULL,
      "vector" real[] NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY ("foto_id", "modelo"),
      CONSTRAINT "CK_embedding_dimensions" CHECK (cardinality("vector") = 512 AND array_ndims("vector") = 1)
    )`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "avistamiento_embedding"');
  }
}
