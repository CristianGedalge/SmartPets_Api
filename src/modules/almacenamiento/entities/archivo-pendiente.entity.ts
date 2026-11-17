import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Durable compensation/outbox: never store credentials or binary data here.
@Entity('archivo_pendiente_eliminacion')
export class ArchivoPendiente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500, unique: true })
  storageKey: string;

  @Column({ name: 'disponible_desde', type: 'timestamptz' })
  disponibleDesde: Date;
}
