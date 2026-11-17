import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnimalResguardado } from '../../resguardo/entities/animal-resguardado.entity';
import type { Adopcion } from './adopcion.entity';
export enum EstadoAdopcion {
  PUBLICADA = 'PUBLICADA',
  RETIRADA = 'RETIRADA',
  ADOPTADA = 'ADOPTADA',
}
@Entity('publicacion_adopcion')
export class PublicacionAdopcion {
  // Populated only by private management queries, not a separate database column.
  registroAdopcion?: Adopcion;
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'animal_resguardado_id', type: 'uuid', unique: true })
  animalResguardadoId: string;
  @OneToOne(() => AnimalResguardado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animal_resguardado_id' })
  animal: AnimalResguardado;
  @Column({ type: 'text' }) descripcion: string;
  @Column({ type: 'text', nullable: true }) requisitos: string | null;
  @Column({ type: 'varchar', length: 20, default: EstadoAdopcion.PUBLICADA })
  estado: EstadoAdopcion;
  @Column({ name: 'fecha_adopcion', type: 'timestamptz', nullable: true })
  fechaAdopcion: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
