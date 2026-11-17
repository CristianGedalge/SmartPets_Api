import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Especie } from '../../especies/entities/especie.entity';
import { FotoMascota } from './foto-mascota.entity';

export enum SexoMascota {
  MACHO = 'MACHO',
  HEMBRA = 'HEMBRA',
  DESCONOCIDO = 'DESCONOCIDO',
}

@Entity('mascota')
export class Mascota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'especie_id', type: 'integer' })
  especieId: number;

  @ManyToOne(() => Especie, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'especie_id' })
  especie: Especie;

  @Column({ name: 'raza_nombre', type: 'varchar', length: 100, nullable: true })
  razaNombre: string | null;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  sexo: SexoMascota | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  color: string | null;

  @Column({
    name: 'peso_kg',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  pesoKg: number | null;

  @Column({ name: 'edad_aproximada_meses', type: 'integer', nullable: true })
  edadAproximadaMeses: number | null;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => FotoMascota, (foto) => foto.mascota)
  fotos: FotoMascota[];
}
