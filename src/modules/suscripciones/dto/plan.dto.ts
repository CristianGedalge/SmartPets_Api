import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const nullableInt = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return Number(value);
  return value;
};

const nullableText = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text.length ? text : null;
};

export class CreatePlanDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre: string;

  @IsOptional()
  @Transform(nullableText)
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioReferencial: number;

  @IsOptional()
  @Transform(nullableInt)
  @IsInt()
  @Min(0)
  busquedasFotoMes?: number | null;

  @IsOptional()
  @Transform(nullableInt)
  @IsInt()
  @Min(0)
  mensajesAgenteMes?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @Transform(nullableText)
  @IsString()
  @MaxLength(500)
  descripcion?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioReferencial?: number;

  @IsOptional()
  @Transform(nullableInt)
  @IsInt()
  @Min(0)
  busquedasFotoMes?: number | null;

  @IsOptional()
  @Transform(nullableInt)
  @IsInt()
  @Min(0)
  mensajesAgenteMes?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
