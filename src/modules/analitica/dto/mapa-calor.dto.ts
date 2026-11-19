import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class MapaCalorDto {
  @IsIn(['ALERTAS', 'AVISTAMIENTOS'])
  tipo: 'ALERTAS' | 'AVISTAMIENTOS' = 'ALERTAS';

  @IsOptional()
  @IsIn([
    'ACTIVA',
    'RESUELTA',
    'CANCELADA',
    'ACTIVO',
    'CERRADO',
    'CANCELADO',
    'TODOS',
  ])
  estado?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  hasta?: string;
}
