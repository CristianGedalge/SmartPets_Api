import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Plan } from './plan.entity';
import { Suscripcion } from './suscripcion.entity';

export enum EstadoPago {
  PAGADO = 'PAGADO',
}

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @ManyToOne(() => Plan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'suscripcion_id', type: 'uuid' })
  suscripcionId: string;

  @ManyToOne(() => Suscripcion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'suscripcion_id' })
  suscripcion: Suscripcion;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto: string;

  @Column({ type: 'varchar', length: 3, default: 'BOB' })
  moneda: string;

  @Column({ type: 'varchar', length: 20 })
  estado: EstadoPago;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
