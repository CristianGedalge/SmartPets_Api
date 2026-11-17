import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Conversacion } from './conversacion.entity';
import { Mensaje } from './mensaje.entity';

@Entity('participante_conversacion')
@Unique('UQ_participante_conversacion_usuario', ['conversacionId', 'usuarioId'])
@Index('IDX_participante_bandeja', ['usuarioId', 'conversacionId'])
export class ParticipanteConversacion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'conversacion_id', type: 'uuid' }) conversacionId: string;
  @ManyToOne(() => Conversacion, (conversacion) => conversacion.participantes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversacion_id' })
  conversacion: Conversacion;
  @Column({ name: 'usuario_id', type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ name: 'ultima_lectura_at', type: 'timestamptz', nullable: true })
  ultimaLecturaAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @OneToMany(() => Mensaje, (mensaje) => mensaje.participante)
  mensajes: Mensaje[];
}
