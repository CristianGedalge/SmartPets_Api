import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegistrarAdopcionDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreAdoptante: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  telefonoAdoptante: string;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaAdopcion: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  observaciones?: string | null;
}
