import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SexoMascota } from '../entities/mascota.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const numeric = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

export class CreateMascotaDto {
  @Transform(numeric)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  especieId: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  razaNombre?: string | null;

  @IsOptional()
  @IsEnum(SexoMascota)
  sexo?: SexoMascota | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  color?: string | null;

  @IsOptional()
  @Transform(numeric)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999.99)
  pesoKg?: number | null;

  @IsOptional()
  @Transform(numeric)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  edadAproximadaMeses?: number | null;
}
