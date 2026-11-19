import { IsISO8601, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AsignarSuscripcionDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  fin?: string | null;
}
