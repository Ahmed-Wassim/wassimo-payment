import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity.ts';

export const ORGANIZATION_STATUSES = ['active', 'disabled'] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'is_platform', default: false })
  isPlatform!: boolean;

  @Column({ type: 'varchar', length: 255, default: 'active' })
  status!: OrganizationStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Application, (application) => application.organization)
  applications!: Application[];
}
