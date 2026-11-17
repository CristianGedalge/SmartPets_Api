import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParticipanteConversacion } from './participante-conversacion.entity';

@Entity('mensaje')
@Check(
  'CK_mensaje_contenido',
  'char_length("contenido") <= 4000 AND "contenido" ~ \'[^[:space:]]\'',
)
@Index('IDX_mensaje_historial', ['participanteId', 'createdAt', 'id'])
export class Mensaje {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'participante_id', type: 'uuid' }) participanteId: string;
  @ManyToOne(
    () => ParticipanteConversacion,
    (participante) => participante.mensajes,
    { nullable: false, onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'participante_id' })
  participante: ParticipanteConversacion;
  @Column({ type: 'text' }) contenido: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
