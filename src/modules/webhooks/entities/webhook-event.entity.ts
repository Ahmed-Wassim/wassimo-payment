import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const WEBHOOK_EVENT_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  IGNORED: 'ignored',
} as const;

export type WebhookEventStatus =
  (typeof WEBHOOK_EVENT_STATUS)[keyof typeof WEBHOOK_EVENT_STATUS];

export const WEBHOOK_INGEST_STATUS = {
  DUPLICATE: 'duplicate',
} as const;

export type WebhookIngestStatus =
  | WebhookEventStatus
  | (typeof WEBHOOK_INGEST_STATUS)[keyof typeof WEBHOOK_INGEST_STATUS];

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

  @Column({ type: 'text', default: WEBHOOK_EVENT_STATUS.PENDING })
  status!: WebhookEventStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}
