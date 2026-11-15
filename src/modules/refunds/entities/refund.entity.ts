import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { RefundStatus } from '../refund-states.ts';

@Entity('refunds')
@Index('refunds_payment', ['paymentId'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'payment_id' })
  paymentId!: string;

  @Column({ name: 'organization_id' })
  organizationId!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'text', default: 'requested' })
  status!: RefundStatus;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
