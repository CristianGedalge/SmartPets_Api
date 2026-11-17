import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Avistamiento } from './avistamiento.entity';

@Entity('avistamiento_foto')
export class FotoAvistamiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'avistamiento_id', type: 'uuid' })
  avistamientoId: string;

  @ManyToOne(() => Avistamiento, (avistamiento) => avistamiento.fotos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'avistamiento_id' })
  avistamiento: Avistamiento;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, unique: true })
  storageKey: string;

  @Column({ type: 'varchar', length: 20 })
  proveedor: string;

  @Column({ name: 'es_principal', type: 'boolean', default: false })
  esPrincipal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
