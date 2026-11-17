import { PartialType } from '@nestjs/mapped-types';
import { CreateAvistamientoDto } from './create-avistamiento.dto';
export class UpdateAvistamientoDto extends PartialType(CreateAvistamientoDto, {
  skipNullProperties: false,
}) {}
