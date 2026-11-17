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
import { FotoAvistamiento } from './foto-avistamiento.entity';
import { EstadoAvistamiento } from '../enums/estado-avistamiento.enum';

@Entity('avistamiento')
export class Avistamiento {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'usuario_id', type: 'uuid' }) usuarioId: string;
  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ name: 'especie_id', type: 'integer' }) especieId: number;
  @ManyToOne(() => Especie, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'especie_id' })
  especie: Especie;
  @Column({ type: 'text' }) descripcion: string;
  @Column({ type: 'varchar', length: 255 }) direccion: string;
  @Column({ name: 'fecha_avistamiento', type: 'timestamptz' })
  fechaAvistamiento: Date;
  @Column({ type: 'numeric', precision: 10, scale: 8 }) latitud: number;
  @Column({ type: 'numeric', precision: 11, scale: 8 }) longitud: number;
  @Column({ type: 'varchar', length: 20, default: EstadoAvistamiento.ACTIVO })
  estado: EstadoAvistamiento;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
  @OneToMany(() => FotoAvistamiento, (foto) => foto.avistamiento)
  fotos: FotoAvistamiento[];
}
