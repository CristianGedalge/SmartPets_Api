import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AlertaExtravio } from '../alertas-extravio/entities/alerta-extravio.entity';
import { Avistamiento } from '../avistamientos/entities/avistamiento.entity';
import { EstadoAvistamiento } from '../avistamientos/enums/estado-avistamiento.enum';
import { EstadoAlerta } from '../alertas-extravio/enums/estado-alerta.enum';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Conversacion } from './entities/conversacion.entity';
import { ParticipanteConversacion } from './entities/participante-conversacion.entity';
import { Mensaje } from './entities/mensaje.entity';
import {
  ChatPaginationDto,
  CreateConversacionDto,
  MensajesQueryDto,
  SendMensajeDto,
} from './dto/chat.dto';
import { ChatEvents } from './chat.events';

@Injectable()
export class ChatService {
  constructor(
    private readonly ds: DataSource,
    private readonly events: ChatEvents,
  ) {}
  async create(user: string, dto: CreateConversacionDto) {
    if (Number(!!dto.alertaId) + Number(!!dto.avistamientoId) !== 1)
      throw new BadRequestException(
        'Indica una alerta o un avistamiento, no ambos.',
      );
    const id = await this.ds.transaction(async (manager) => {
      let owner: string, active: boolean;
      if (dto.alertaId) {
        const alert = await manager.findOne(AlertaExtravio, {
          where: { id: dto.alertaId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!alert) throw new NotFoundException('Publicación no encontrada.');
        const pet = await manager
          .getRepository(AlertaExtravio)
          .createQueryBuilder('a')
          .innerJoinAndSelect('a.mascota', 'pet')
          .where('a.id=:id', { id: alert.id })
          .getOne();
        if (!pet) throw new NotFoundException('Publicación no encontrada.');
        owner = pet.mascota.usuarioId;
        active = alert.estado === EstadoAlerta.ACTIVA && pet.mascota.estado;
      } else {
        const sighting = await manager.findOne(Avistamiento, {
          where: { id: dto.avistamientoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!sighting)
          throw new NotFoundException('Publicación no encontrada.');
        owner = sighting.usuarioId;
        active = sighting.estado === EstadoAvistamiento.ACTIVO;
      }
      if (owner === user)
        throw new ConflictException(
          'Esta publicación es tuya. Revisa tu bandeja para responder a quienes te contacten.',
        );
      if (!(await manager.existsBy(Usuario, { id: owner, estado: true })))
        throw new NotFoundException('El autor ya no está disponible.');
      const existing = await manager
        .getRepository(Conversacion)
        .createQueryBuilder('c')
        .innerJoin('c.participantes', 'me', 'me.usuarioId=:user', { user })
        .innerJoin('c.participantes', 'other', 'other.usuarioId=:owner', {
          owner,
        })
        .where(
          dto.alertaId ? 'c.alertaId=:context' : 'c.avistamientoId=:context',
          { context: dto.alertaId ?? dto.avistamientoId },
        )
        .getOne();
      if (existing) return existing.id;
      if (!active)
        throw new NotFoundException(
          'Esta publicación ya no está disponible para iniciar un chat.',
        );
      const chat = await manager.save(
        Conversacion,
        manager.create(Conversacion, {
          alertaId: dto.alertaId ?? null,
          avistamientoId: dto.avistamientoId ?? null,
        }),
      );
      await manager.save(
        ParticipanteConversacion,
        [user, owner].map((usuarioId) =>
          manager.create(ParticipanteConversacion, {
            conversacionId: chat.id,
            usuarioId,
            ultimaLecturaAt: null,
          }),
        ),
      );
      return chat.id;
    });
    return this.findOne(user, id);
  }
  async findAll(user: string, query: ChatPaginationDto) {
    const chats = await this.ds
      .getRepository(Conversacion)
      .createQueryBuilder('c')
      .innerJoin('c.participantes', 'me', 'me.usuarioId=:user', { user })
      .addSelect(
        (sub) =>
          sub
            .select('MAX(m.createdAt)')
            .from(Mensaje, 'm')
            .innerJoin('m.participante', 'p')
            .where('p.conversacionId=c.id'),
        'last_activity',
      )
      .orderBy(
        'COALESCE((SELECT MAX(m.created_at) FROM mensaje m JOIN participante_conversacion p ON p.id=m.participante_id WHERE p.conversacion_id=c.id), c.created_at)',
        'DESC',
      )
      .addOrderBy('c.id', 'DESC')
      .limit(query.limit)
      .offset(query.offset)
      .getMany();
    return Promise.all(chats.map((chat) => this.findOne(user, chat.id)));
  }
  async findOne(user: string, id: string) {
    const me = await this.member(this.ds.manager, user, id);
    const chat = await this.ds.getRepository(Conversacion).findOneOrFail({
      where: { id },
      relations: {
        alerta: { mascota: true },
        avistamiento: { especie: true },
      },
    });
    const other = await this.ds
      .getRepository(ParticipanteConversacion)
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.usuario', 'u')
      .where('p.conversacionId=:id AND p.usuarioId <> :user', { id, user })
      .getOne();
    const last = await this.messagesQuery(id)
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .getOne();
    let unread = this.messagesQuery(id).where(
      'p.conversacionId=:id AND p.usuarioId <> :user',
      { id, user },
    );
    if (me.ultimaLecturaAt)
      unread = unread.andWhere('m.createdAt > :read', {
        read: me.ultimaLecturaAt,
      });
    return {
      id,
      contexto: {
        tipo: chat.alertaId ? 'ALERTA' : 'AVISTAMIENTO',
        id: chat.alertaId ?? chat.avistamientoId,
        titulo: chat.alerta
          ? chat.alerta.mascota.nombre
          : (chat.avistamiento?.especie.nombre ?? 'Mascota vista'),
        estado: chat.alerta?.estado ?? chat.avistamiento?.estado,
      },
      interlocutor: {
        nombre: other?.usuario.estado
          ? [other.usuario.nombre, other.usuario.apellido].join(' ')
          : 'Usuario no disponible',
      },
      ultimoMensaje: last ? this.messageResponse(last, me.id) : null,
      noLeidos: await unread.getCount(),
    };
  }
  async findMessages(user: string, id: string, query: MensajesQueryDto) {
    const me = await this.member(this.ds.manager, user, id);
    if (query.antesDe && query.despuesDe)
      throw new BadRequestException('Usa un solo cursor.');
    let messages = this.messagesQuery(id);
    const cursorId = query.antesDe ?? query.despuesDe;
    if (cursorId) {
      const cursor = await this.messagesQuery(id)
        .andWhere('m.id=:cursorId', { cursorId })
        .getOne();
      if (!cursor)
        throw new BadRequestException(
          'El cursor no pertenece a esta conversación.',
        );
      const op = query.despuesDe ? '>' : '<';
      messages = messages.andWhere(
        `(m.createdAt,m.id) ${op} (:date,:cursorId)`,
        { date: cursor.createdAt, cursorId },
      );
    }
    const direction = query.despuesDe ? 'ASC' : 'DESC';
    const items = await messages
      .orderBy('m.createdAt', direction)
      .addOrderBy('m.id', direction)
      .take(query.limit + 1)
      .getMany();
    const hayMas = items.length > query.limit;
    items.splice(query.limit);
    if (!query.despuesDe) items.reverse();
    return {
      items: items.map((item) => this.messageResponse(item, me.id)),
      hayMas,
    };
  }
  async send(user: string, id: string, dto: SendMensajeDto) {
    const result = await this.ds.transaction(async (manager) => {
      await this.member(manager, user, id);
      await manager.findOne(Conversacion, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      const members = await manager.find(ParticipanteConversacion, {
        where: { conversacionId: id },
        relations: { usuario: true },
      });
      const me = members.find((p) => p.usuarioId === user)!;
      if (members.length !== 2 || members.some((p) => !p.usuario.estado))
        throw new ForbiddenException(
          'Uno de los participantes ya no está disponible.',
        );
      const existing = await manager.findOneBy(Mensaje, { id: dto.id });
      if (existing) {
        if (
          existing.participanteId !== me.id ||
          existing.contenido !== dto.contenido
        )
          throw new ConflictException(
            'El identificador del mensaje ya fue utilizado.',
          );
        return {
          message: this.messageResponse(existing, me.id),
          users: members.map((p) => p.usuarioId),
        };
      }
      const last = await manager
        .getRepository(Mensaje)
        .createQueryBuilder('m')
        .innerJoin('m.participante', 'p')
        .where('p.conversacionId=:id', { id })
        .orderBy('m.createdAt', 'DESC')
        .getOne();
      const createdAt = new Date(
        Math.max(Date.now(), last ? last.createdAt.getTime() + 1 : 0),
      );
      const message = await manager.save(
        Mensaje,
        manager.create(Mensaje, {
          id: dto.id,
          participanteId: me.id,
          contenido: dto.contenido,
          createdAt,
        }),
      );
      return {
        message: this.messageResponse(message, me.id),
        users: members.map((p) => p.usuarioId),
      };
    });
    this.events.notify(result.users, id);
    return result.message;
  }
  async markRead(user: string, id: string, messageId: string) {
    const me = await this.member(this.ds.manager, user, id);
    const message = await this.messagesQuery(id)
      .andWhere('m.id=:messageId', { messageId })
      .getOne();
    if (!message)
      throw new BadRequestException(
        'El mensaje no pertenece a esta conversación.',
      );
    await this.ds
      .getRepository(ParticipanteConversacion)
      .createQueryBuilder()
      .update()
      .set({
        ultimaLecturaAt: () =>
          'GREATEST(COALESCE("ultima_lectura_at", \'-infinity\'::timestamptz), :date)',
      })
      .where('id=:memberId', { memberId: me.id })
      .setParameter('date', message.createdAt)
      .execute();
    return { leido: true };
  }
  private async member(manager: EntityManager, user: string, id: string) {
    const me = await manager.findOneBy(ParticipanteConversacion, {
      conversacionId: id,
      usuarioId: user,
    });
    if (!me) throw new NotFoundException('Conversación no encontrada.');
    return me;
  }
  private messagesQuery(id: string) {
    return this.ds
      .getRepository(Mensaje)
      .createQueryBuilder('m')
      .innerJoin('m.participante', 'p')
      .where('p.conversacionId=:id', { id });
  }
  private messageResponse(message: Mensaje, memberId: string) {
    return {
      id: message.id,
      contenido: message.contenido,
      createdAt: message.createdAt,
      esPropio: message.participanteId === memberId,
    };
  }
}
