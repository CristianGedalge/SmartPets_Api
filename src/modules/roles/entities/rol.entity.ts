import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum RolNombre {
  ADMIN = 'ADMIN',
  CIUDADANO = 'CIUDADANO',
  ENCARGADO = 'ENCARGADO',
}

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn('increment', { type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: false })
  nombre: string;

  @OneToMany(() => Usuario, (usuario) => usuario.rol)
  usuarios: Usuario[];
}
