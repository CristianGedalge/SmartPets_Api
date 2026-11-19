import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('aceptacion_legal')
export class AceptacionLegal {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' }) usuarioId: string;
  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  @Column({ name: 'version_terminos', type: 'varchar', length: 40 })
  versionTerminos: string;
  @Column({ name: 'version_privacidad', type: 'varchar', length: 40 })
  versionPrivacidad: string;
  @CreateDateColumn({ name: 'aceptado_en', type: 'timestamptz' })
  aceptadoEn: Date;
}
