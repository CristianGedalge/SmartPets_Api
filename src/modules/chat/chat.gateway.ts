import { Inject, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { isUUID } from 'class-validator';
import { DataSource } from 'typeorm';
import { jwtConfig } from '../../config';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ChatEvents } from './chat.events';

@WebSocketGateway({
  namespace: '/chat',
  maxHttpBufferSize: 8192,
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow: boolean) => void,
    ) => {
      const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
        .split(',')
        .map((value) => value.trim());
      callback(
        null,
        !origin || origins.includes('*') || origins.includes(origin),
      );
    },
  },
})
export class ChatGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  private readonly jwt = new JwtService();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private unsubscribe?: () => void;
  constructor(
    private readonly ds: DataSource,
    private readonly events: ChatEvents,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}
  afterInit(server: Namespace) {
    server.use((socket, next) => {
      void this.authenticate(socket)
        .then(() => next())
        .catch(() => next(new Error('Sesión no válida. Vuelve a ingresar.')));
    });
    this.unsubscribe = this.events.subscribe((users, conversacionId) => {
      for (const user of users)
        server.to(`user:${user}`).emit('chat:actualizado', { conversacionId });
    });
  }
  private async authenticate(socket: Socket) {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length > 8192)
      throw new Error('Invalid token');
    const payload = await this.jwt.verifyAsync<{ sub: string; exp: number }>(
      token,
      { secret: this.config.secret },
    );
    if (
      !isUUID(payload.sub) ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1000 <= Date.now()
    )
      throw new Error('Invalid claims');
    if (
      !(await this.ds
        .getRepository(Usuario)
        .existsBy({ id: payload.sub, estado: true }))
    )
      throw new Error('Inactive user');
    const data = socket.data as { userId?: string; expiresAt?: number };
    data.userId = payload.sub;
    data.expiresAt = payload.exp * 1000;
  }
  async handleConnection(socket: Socket) {
    const data = socket.data as { userId?: string; expiresAt?: number };
    const user = data.userId;
    if (typeof user !== 'string') {
      socket.disconnect(true);
      return;
    }
    await socket.join(`user:${user}`);
    const expiresAt = data.expiresAt!;
    this.timers.set(
      socket.id,
      setTimeout(
        () => socket.disconnect(true),
        Math.min(expiresAt - Date.now(), 2147483647),
      ),
    );
  }
  handleDisconnect(socket: Socket) {
    clearTimeout(this.timers.get(socket.id));
    this.timers.delete(socket.id);
  }
  onModuleDestroy() {
    this.unsubscribe?.();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}
