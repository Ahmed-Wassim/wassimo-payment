import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ProviderEnvironment = 'test' | 'live';

export type ProviderAccountStatus = 'enabled' | 'disabled';

@Entity('provider_accounts')
export class ProviderAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'provider_code', type: 'text' })
  providerCode!: string;

  @Column({ type: 'text' })
  environment!: ProviderEnvironment;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ type: 'text', default: 'disabled' })
  status!: ProviderAccountStatus;

  @Column({ name: 'supported_currencies', type: 'jsonb' })
  supportedCurrencies!: string[];

  @Column({ name: 'supported_methods', type: 'jsonb' })
  supportedMethods!: string[];

  @Column({ type: 'jsonb', default: '{}' })
  config!: Record<string, unknown>;

  @Column({ name: 'credentials_ref', nullable: true, type: 'text' })
  credentialsRef!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
