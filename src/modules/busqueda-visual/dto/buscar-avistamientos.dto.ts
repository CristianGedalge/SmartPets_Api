import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class BuscarAvistamientosDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  especieId: number;
}
