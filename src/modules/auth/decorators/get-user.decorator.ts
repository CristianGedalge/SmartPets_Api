import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = req.user;

    if (!user) {
      throw new InternalServerErrorException(
        'Usuario no encontrado en la petición (¿olvidaste @AuthRole?)',
      );
    }

    return data ? user[data] : user;
  },
);
