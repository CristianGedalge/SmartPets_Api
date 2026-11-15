import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoEstablecimiento {
  VETERINARIA = 'VETERINARIA',
  REFUGIO = 'REFUGIO',
}

@Entity('establecimiento')
export class Establecimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', unique: true, nullable: false })
  usuarioId: string;

  @OneToOne(() => Usuario, (usuario) => usuario.establecimiento, {
    nullable: false,
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ type: 'varchar', length: 150, nullable: false })
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoEstablecimiento,
    nullable: false,
  })
  tipo: TipoEstablecimiento;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  direccion: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitud: number | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  telefono: string;

  @Column({
    name: 'horario_atencion',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  horarioAtencion: string | null;

  @Column({ type: 'boolean', nullable: false, default: true })
  estado: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    nullable: false,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    nullable: false,
  })
  updatedAt: Date;
}
