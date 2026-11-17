import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mascota } from '../../mascotas/entities/mascota.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
export enum EstadoResguardo {
  EN_RESGUARDO = 'EN_RESGUARDO',
  ADOPTADO = 'ADOPTADO',
}
@Entity('animal_resguardado')
export class AnimalResguardado {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'mascota_id', type: 'uuid', unique: true }) mascotaId: string;
  @OneToOne(() => Mascota, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mascota_id' })
  mascota: Mascota;
  @Column({ name: 'establecimiento_id', type: 'uuid' })
  establecimientoId: string;
  @ManyToOne(() => Establecimiento, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'establecimiento_id' })
  establecimiento: Establecimiento;
  @Column({
    type: 'varchar',
    length: 20,
    default: EstadoResguardo.EN_RESGUARDO,
  })
  estado: EstadoResguardo;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
