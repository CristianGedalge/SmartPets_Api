import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMascotaDto } from './create-mascota.dto';

export class UpdateMascotaDto extends PartialType(CreateMascotaDto, {
  skipNullProperties: false,
}) {
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
