import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EnviarContactoDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(150)
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  @Matches(/^[^\r\n]+$/, { message: 'El asunto no admite saltos de línea.' })
  asunto: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  mensaje: string;

  @IsOptional()
  @IsString()
  @IsEmpty({ message: 'Solicitud inválida.' })
  sitioWeb?: string;
}
