import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('especie')
export class Especie {
  @PrimaryGeneratedColumn('increment', { type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;
}
