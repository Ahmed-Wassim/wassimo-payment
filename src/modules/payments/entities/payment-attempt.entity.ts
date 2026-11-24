import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AttemptStatus } from '../attempt-states.ts';
import { Organization } from '../../organizations/entities/organization.entity.ts';
import { ProviderAccount } from '../../providers/entities/provider-account.entity.ts';
import { Payment } from './payment.entity.ts';

@Entity('payment_attempts')
@Index('payment_attempts_payment', ['payment'])
@Index('payment_attempts_provider_reference', ['providerReference'], {
  where: '"provider_reference" IS NOT NULL',
})
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Payment, { nullable: false })
  @JoinColumn({
    name: 'payment_id',
    foreignKeyConstraintName: 'FK_payment_attempts_payment_id',
  })
  payment!: Payment;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({
    name: 'organization_id',
    foreignKeyConstraintName: 'FK_payment_attempts_organization_id',
  })
  organization!: Organization;

  @ManyToOne(() => ProviderAccount, { nullable: false })
  @JoinColumn({
    name: 'provider_account_id',
    foreignKeyConstraintName: 'FK_payment_attempts_provider_account_id',
  })
  providerAccount!: ProviderAccount;

  @Column({ type: 'text', default: 'charge' })
  operation!: string;

  @Column({ type: 'text', default: 'initiated' })
  status!: AttemptStatus;

  @Column({ name: 'provider_reference', type: 'text', nullable: true })
  providerReference!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  diagnostics!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
