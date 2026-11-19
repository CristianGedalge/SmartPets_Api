import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('verificacion_email')
export class VerificacionEmail {
  @PrimaryColumn({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'codigo_hash', type: 'varchar', length: 128 })
  codigoHash: string;

  @Column({ type: 'varchar', length: 64 })
  salt: string;

  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  @Column({ type: 'smallint', default: 0 })
  intentos: number;

  @Column({ name: 'enviado_en', type: 'timestamptz' })
  enviadoEn: Date;
}
