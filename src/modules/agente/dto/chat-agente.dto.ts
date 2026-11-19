import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export enum RolMensajeAgente {
  USUARIO = 'USUARIO',
  ASISTENTE = 'ASISTENTE',
}

export class MensajeAgenteDto {
  @IsEnum(RolMensajeAgente)
  rol: RolMensajeAgente;

  @IsString()
  @Length(1, 1500)
  contenido: string;
}

export class ChatAgenteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => MensajeAgenteDto)
  mensajes: MensajeAgenteDto[];
}
