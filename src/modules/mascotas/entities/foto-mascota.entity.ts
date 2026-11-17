import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Mascota } from './mascota.entity';

@Entity('foto_mascota')
export class FotoMascota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mascota_id', type: 'uuid' })
  mascotaId: string;

  @ManyToOne(() => Mascota, (mascota) => mascota.fotos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mascota_id' })
  mascota: Mascota;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, unique: true })
  storageKey: string;

  @Column({ type: 'varchar', length: 20 })
  proveedor: string;

  @Column({ name: 'es_principal', type: 'boolean', default: false })
  esPrincipal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
