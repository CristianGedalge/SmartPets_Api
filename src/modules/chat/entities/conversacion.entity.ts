import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AlertaExtravio } from '../../alertas-extravio/entities/alerta-extravio.entity';
import { Avistamiento } from '../../avistamientos/entities/avistamiento.entity';
import { ParticipanteConversacion } from './participante-conversacion.entity';

@Entity('conversacion')
@Check(
  'CK_conversacion_contexto',
  '("alerta_id" IS NOT NULL) <> ("avistamiento_id" IS NOT NULL)',
)
@Index('IDX_conversacion_alerta', ['alertaId'], {
  where: '"alerta_id" IS NOT NULL',
})
@Index('IDX_conversacion_avistamiento', ['avistamientoId'], {
  where: '"avistamiento_id" IS NOT NULL',
})
export class Conversacion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'alerta_id', type: 'uuid', nullable: true }) alertaId:
    string | null;
  @ManyToOne(() => AlertaExtravio, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'alerta_id' })
  alerta: AlertaExtravio | null;
  @Column({ name: 'avistamiento_id', type: 'uuid', nullable: true })
  avistamientoId: string | null;
  @ManyToOne(() => Avistamiento, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'avistamiento_id' })
  avistamiento: Avistamiento | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @OneToMany(
    () => ParticipanteConversacion,
    (participante) => participante.conversacion,
  )
  participantes: ParticipanteConversacion[];
}
