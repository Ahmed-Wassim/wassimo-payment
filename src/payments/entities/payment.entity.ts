import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PaymentStatus } from '../states.ts';

@Entity('payments')
@Index('payments_org_reference', ['organizationId', 'reference'], {
  unique: true,
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id' })
  organizationId!: string;

  @Column({ name: 'application_id' })
  applicationId!: string;

  @Column()
  reference!: string;

  @Column({ name: 'amount_minor', type: 'bigint' })
  amountMinor!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ default: 'created' })
  status!: PaymentStatus;

  @Column({ name: 'provider_account_id', type: 'uuid', nullable: true })
  providerAccountId!: string | null;

  @Column({ type: 'text', nullable: true })
  method!: string | null;

  @Column({ name: 'captured_minor', type: 'bigint' })
  capturedMinor!: string;

  @Column({ name: 'refunded_confirmed_minor', type: 'bigint' })
  refundedConfirmedMinor!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
