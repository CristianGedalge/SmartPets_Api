import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface DatabaseDriverError {
  code?: string;
  detail?: string;
  column?: string;
  table?: string;
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DatabaseExceptionFilter');

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const driverError = exception.driverError as DatabaseDriverError;

    const code = driverError?.code;
    const detail = driverError?.detail;

    // 1. 23505: Violación de restricción UNIQUE (registro duplicado)
    if (code === '23505') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: detail ?? 'Ya existe un registro con esos datos únicos.',
      });
      return;
    }

    // 2. 23503: Violación de llave foránea (FOREIGN KEY)
    if (code === '23503') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message:
          detail ??
          'El registro referenciado no existe o no puede eliminarse porque está en uso.',
      });
      return;
    }

    // 3. 23502: Violación de NOT NULL (o 22P02: formato/UUID inválido)
    if (code === '23502' || code === '22P02') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message:
          code === '23502'
            ? `El campo obligatorio '${driverError?.column ?? 'desconocido'}' no puede ser nulo.`
            : 'El formato del identificador o dato enviado no es válido.',
      });
      return;
    }

    this.logger.error(
      `Error de base de datos no controlado (código ${code ?? 'N/A'}): ${exception.message}`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Error interno en el servidor, revisa los logs del backend.',
    });
  }
}
