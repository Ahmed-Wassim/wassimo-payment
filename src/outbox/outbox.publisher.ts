import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as amqp from 'amqplib';
import { Repository } from 'typeorm';
import { APP_CONFIG } from '../config/config.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { EVENTS_EXCHANGE } from '../events/envelope.ts';
import { OutboxEvent } from './entities/outbox-event.entity.ts';

type ClaimedRow = {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  occurred_at: Date;
  attempts: number;
};

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @InjectRepository(OutboxEvent) private readonly outbox: Repository<OutboxEvent>,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), this.cfg.outbox.pollSeconds * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.claimBatch(20);
      if (rows.length) await this.publishBatch(rows);
    } catch (err) {
      this.logger.warn(`outbox tick failed: ${this.message(err)}`);
    } finally {
      this.running = false;
    }
  }

  private async claimBatch(limit: number): Promise<ClaimedRow[]> {
    return (await this.outbox.query(
      `WITH claimed AS (
         SELECT id FROM outbox_events
          WHERE status = 'pending' AND next_attempt_at <= now()
          ORDER BY created_at LIMIT $1
          FOR UPDATE SKIP LOCKED
       )
       UPDATE outbox_events o
          SET next_attempt_at = now() + interval '30 seconds'
         FROM claimed c WHERE o.id = c.id
       RETURNING o.id, o.event_id, o.event_type, o.payload, o.correlation_id, o.occurred_at, o.attempts`,
      [limit],
    )) as ClaimedRow[];
  }

  private async publishBatch(rows: ClaimedRow[]): Promise<void> {
    let conn: amqp.ChannelModel | undefined;
    let ch: amqp.ConfirmChannel | undefined;

    try {
      conn = await amqp.connect(this.cfg.broker.url);
      ch = await conn.createConfirmChannel();
      await ch.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
    } catch (err) {
      const msg = this.message(err);
      this.logger.warn(`outbox publish failed: ${msg}`);
      for (const row of rows) await this.markFailed(row, msg);
      await this.close(ch, conn);
      return;
    }

    for (const row of rows) {
      try {
        ch.publish(
          EVENTS_EXCHANGE,
          row.event_type,
          Buffer.from(JSON.stringify(this.toEnvelope(row))),
          { contentType: 'application/json', persistent: true, messageId: row.event_id },
        );
        await ch.waitForConfirms();
        await this.outbox.update({ id: row.id }, { status: 'published', publishedAt: new Date(), lastError: null });
      } catch (err) {
        await this.markFailed(row, this.message(err));
      }
    }

    await this.close(ch, conn);
  }

  private async close(ch?: amqp.ConfirmChannel, conn?: amqp.ChannelModel): Promise<void> {
    try { await ch?.close(); } catch {}
    try { await conn?.close(); } catch {}
  }

  private toEnvelope(row: ClaimedRow) {
    return {
      event_id: row.event_id,
      event_type: row.event_type,
      version: '1',
      occurred_at: new Date(row.occurred_at).toISOString(),
      correlation_id: row.correlation_id,
      producer: 'wassimo-payment',
      payload: row.payload,
    };
  }

  private async markFailed(row: ClaimedRow, error: string): Promise<void> {
    const attempts = (Number(row.attempts) || 0) + 1;
    const delay = Math.min(300, 2 ** attempts);
    if (!row.id) return;
    await this.outbox.query(
      `UPDATE outbox_events
          SET status = 'pending', attempts = $2, last_error = $3,
              next_attempt_at = now() + ($4::int * interval '1 second')
        WHERE id = $1`,
      [row.id, attempts, error.slice(0, 500), delay],
    );
  }

  private message(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
