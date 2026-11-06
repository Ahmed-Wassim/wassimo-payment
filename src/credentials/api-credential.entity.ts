import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Application } from '../applications/application.entity.ts';

@Entity('api_credentials')
export class ApiCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({
    name: 'key_id',
    type: 'text',
    unique: true,
    nullable: false,
  })
  keyId!: string;

  @Column({
    name: 'secret_hash',
    type: 'text',
    nullable: false,
  })
  secretHash!: string;

  @Column({ name: 'prefix', type: 'varchar', length: 255, nullable: false })
  prefix!: string;

  @Column({
    name: 'environment',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  environment!: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb", nullable: false })
  scopes!: string[];

  @Column({ type: 'varchar', length: 255, default: 'active', nullable: false })
  status!: string;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt!: Date;

  @Column({
    name: 'revoked_at',
    type: 'timestamptz',
    nullable: true,
  })
  revokedAt!: Date | null;
}
