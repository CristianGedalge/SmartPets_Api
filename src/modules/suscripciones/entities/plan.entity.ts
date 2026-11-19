import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('plan')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    name: 'precio_referencial',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  precioReferencial: string;

  @Column({ name: 'busquedas_foto_mes', type: 'integer', nullable: true })
  busquedasFotoMes: number | null;

  @Column({ name: 'mensajes_agente_mes', type: 'integer', nullable: true })
  mensajesAgenteMes: number | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
