import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { FotoAvistamiento } from '../../avistamientos/entities/foto-avistamiento.entity';

@Entity('avistamiento_embedding')
export class AvistamientoEmbedding {
  @PrimaryColumn({ name: 'foto_id', type: 'uuid' }) fotoId: string;
  @PrimaryColumn({ name: 'modelo', type: 'varchar', length: 100 })
  modelo: string;
  @ManyToOne(() => FotoAvistamiento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foto_id' })
  foto: FotoAvistamiento;
  @Column({ type: 'real', array: true }) vector: number[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
