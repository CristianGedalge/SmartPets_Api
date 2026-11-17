import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AnimalResguardado } from '../../resguardo/entities/animal-resguardado.entity';

@Entity('adopcion')
export class Adopcion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'animal_resguardado_id', type: 'uuid', unique: true })
  animalResguardadoId: string;
  @OneToOne(() => AnimalResguardado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animal_resguardado_id' })
  animal: AnimalResguardado;
  @Column({ name: 'nombre_adoptante', type: 'varchar', length: 150 })
  nombreAdoptante: string;
  @Column({ name: 'telefono_adoptante', type: 'varchar', length: 20 })
  telefonoAdoptante: string;
  @Column({ name: 'fecha_adopcion', type: 'date' })
  fechaAdopcion: string;
  @Column({ type: 'text', nullable: true }) observaciones: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
