import { QueryRunner } from 'typeorm';
import { ResguardoAdopcionesSchema1794952800000 } from '../../src/migrations/1794952800000-ResguardoAdopcionesSchema';
// Existing integration fixtures create auth tables manually in disposable schemas.
export async function installInstitutionSchema(runner: QueryRunner) {
  await runner.query(
    `CREATE TYPE "establecimiento_tipo_enum" AS ENUM ('VETERINARIA','REFUGIO')`,
  );
  await runner.query(`CREATE TABLE "establecimiento" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "usuario_id" uuid NOT NULL UNIQUE REFERENCES "usuario"("id"),
    "nombre" varchar(150) NOT NULL,"tipo" establecimiento_tipo_enum NOT NULL,
    "descripcion" text,"direccion" varchar(255) NOT NULL,"latitud" numeric(10,8),"longitud" numeric(11,8),
    "telefono" varchar(20) NOT NULL,"horario_atencion" varchar(150),"estado" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT now(),"updated_at" timestamptz NOT NULL DEFAULT now()
  )`);
  await new ResguardoAdopcionesSchema1794952800000().up(runner);
}
