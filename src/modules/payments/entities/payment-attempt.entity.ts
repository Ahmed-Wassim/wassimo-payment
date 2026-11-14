import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AttemptStatus } from '../attempt-states.ts';

@Entity('payment_attempts')
@Index('payment_attempts_payment', ['paymentId'])
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'provider_account_id', type: 'uuid' })
  providerAccountId!: string;

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
