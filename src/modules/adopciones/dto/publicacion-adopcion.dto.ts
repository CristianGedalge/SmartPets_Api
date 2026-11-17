import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class CreatePublicacionAdopcionDto {
  @IsUUID() animalResguardadoId: string;
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) requisitos?:
    string | null;
}
export class UpdatePublicacionAdopcionDto extends PartialType(
  OmitType(CreatePublicacionAdopcionDto, ['animalResguardadoId'] as const),
  { skipNullProperties: false },
) {}
export class AdopcionActionDto {}
