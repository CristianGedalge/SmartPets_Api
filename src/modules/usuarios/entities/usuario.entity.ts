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
import { Rol } from '../../roles/entities/rol.entity';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rol_id', type: 'integer', nullable: false })
  rolId: number;

  @ManyToOne(() => Rol, (rol) => rol.usuarios, { nullable: false })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  apellido: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ name: 'foto_url', type: 'text', nullable: true })
  fotoUrl: string | null;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  passwordHash: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  estado: boolean;

  @Column({
    name: 'email_verificado',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  emailVerificado: boolean;

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

  @OneToOne(() => Establecimiento, (establecimiento) => establecimiento.usuario)
  establecimiento?: Establecimiento;
}
