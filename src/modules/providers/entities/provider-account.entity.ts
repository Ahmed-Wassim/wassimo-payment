import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity.ts';
import { Application } from '../../applications/entities/application.entity.ts';
import { Provider } from './provider.entity.ts';

export type ProviderEnvironment = 'test' | 'live';

export type ProviderAccountStatus = 'enabled' | 'disabled';

@Entity('provider_accounts')
export class ProviderAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @ManyToOne(() => Application, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ name: 'provider_code', type: 'text' })
  providerCode!: string;

  @ManyToOne(() => Provider, { nullable: false })
  @JoinColumn({ name: 'provider_code', referencedColumnName: 'code' })
  provider!: Provider;

  @Column({ type: 'text' })
  environment!: ProviderEnvironment;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ type: 'text', default: 'enabled' })
  status!: ProviderAccountStatus;

  @Column({ name: 'supported_currencies', type: 'jsonb' })
  supportedCurrencies!: string[];

  @Column({ name: 'supported_methods', type: 'jsonb' })
  supportedMethods!: string[];

  @Column({ type: 'jsonb', default: '{}' })
  config!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
