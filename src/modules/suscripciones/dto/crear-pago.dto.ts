import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const cardDigits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s-]/g, '') : value;

export class CrearPagoDto {
  @IsUUID()
  planId: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  titular: string;

  @Transform(cardDigits)
  @Matches(/^\d{13,19}$/, { message: 'El número de tarjeta no es válido.' })
  numeroTarjeta: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  mesExpiracion: number;

  @Type(() => Number)
  @IsInt()
  @Min(2026)
  @Max(2100)
  anioExpiracion: number;

  @Transform(trim)
  @Matches(/^\d{3,4}$/, { message: 'El código de seguridad no es válido.' })
  cvv: string;
}
