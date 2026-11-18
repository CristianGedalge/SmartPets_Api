import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
export class CreateConversacionDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  alertaId?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  avistamientoId?: string;
}
export class ChatPaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset = 0;
}
export class MensajesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 30;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  antesDe?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  despuesDe?: string;
}
export class SendMensajeDto {
  @IsUUID() id: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  contenido: string;
}
export class ReadChatDto {
  @IsUUID() mensajeId: string;
}
