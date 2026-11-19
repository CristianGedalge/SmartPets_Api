import { IsUUID } from 'class-validator';

export class CrearPagoDto {
  @IsUUID()
  planId: string;
}
