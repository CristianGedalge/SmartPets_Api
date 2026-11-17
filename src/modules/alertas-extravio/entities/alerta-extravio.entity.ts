import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { EstadoAlerta } from '../enums/estado-alerta.enum';

@Entity('alerta_extravio')
export class AlertaExtravio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mascota_id', type: 'uuid' })
  mascotaId: string;

  @ManyToOne(() => Mascota, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mascota_id' })
  mascota: Mascota;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'fecha_extravio', type: 'timestamptz' })
  fechaExtravio: Date;

  @Column({ type: 'numeric', precision: 10, scale: 8 })
  latitud: number;

  @Column({ type: 'numeric', precision: 11, scale: 8 })
  longitud: number;

  @Column({ type: 'varchar', length: 20, default: EstadoAlerta.ACTIVA })
  estado: EstadoAlerta;

  @Column({ name: 'fecha_resolucion', type: 'timestamptz', nullable: true })
  fechaResolucion: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
