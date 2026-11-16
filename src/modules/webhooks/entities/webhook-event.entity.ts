import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type WebhookEventStatus = 'pending' | 'processed' | 'ignored';

export type WebhookIngestStatus = WebhookEventStatus | 'duplicate';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'provider_account_id', type: 'uuid', nullable: true })
  providerAccountId!: string | null;

  @Column({ name: 'provider_event_id', type: 'text', nullable: true })
  providerEventId!: string | null;

  @Column({ name: 'event_type', type: 'text' })
  eventType!: string;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload!: Record<string, unknown>;

  @Column({ type: 'text', default: 'pending' })
  status!: WebhookEventStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}