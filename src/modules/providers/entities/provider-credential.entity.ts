import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProviderAccount } from './provider-account.entity.ts';

@Entity('provider_credentials')
export class ProviderCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provider_account_id', type: 'uuid', unique: true })
  providerAccountId!: string;

  @OneToOne(() => ProviderAccount)
  @JoinColumn({ name: 'provider_account_id' })
  providerAccount!: ProviderAccount;

  @Column({ name: 'encrypted_payload', type: 'text' })
  encryptedPayload!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
