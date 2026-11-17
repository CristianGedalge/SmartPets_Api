import { Transform } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
} from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const numeric = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
export class CreateAvistamientoDto {
  @Transform(numeric) @IsInt() @Min(1) @Max(2147483647) especieId: number;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(255) direccion: string;
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'fechaAvistamiento debe incluir hora y zona horaria',
  })
  @ValidateBy({
    name: 'notFutureSighting',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        Number.isFinite(Date.parse(value)) &&
        Date.parse(value) <= Date.now(),
      defaultMessage: () => 'La fecha de avistamiento no puede ser futura',
    },
  })
  fechaAvistamiento: string;
  @Transform(numeric)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-90)
  @Max(90)
  latitud: number;
  @Transform(numeric)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(-180)
  @Max(180)
  longitud: number;
}
