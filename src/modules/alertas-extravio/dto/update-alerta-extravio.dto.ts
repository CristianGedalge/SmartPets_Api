import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAlertaExtravioDto } from './create-alerta-extravio.dto';

export class UpdateAlertaExtravioDto extends PartialType(
  OmitType(CreateAlertaExtravioDto, ['mascotaId'] as const),
  { skipNullProperties: false },
) {}
