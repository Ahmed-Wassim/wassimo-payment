import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as amqp from 'amqplib';
import { Repository } from 'typeorm';
import { APP_CONFIG } from '../config/config.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { EVENTS_EXCHANGE } from '../events/envelope.ts';
import { OutboxEvent } from './entities/outbox-event.entity.ts';

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

  private async claimBatch(limit: number): Promise<OutboxEvent[]> {
    return this.outbox.manager.transaction(async (tx) => {
      const batch = await tx
        .createQueryBuilder(OutboxEvent, 'o')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where("o.status = 'pending' AND o.nextAttemptAt <= now()")
        .orderBy('o.createdAt', 'ASC')
        .take(limit)
        .getMany();

      if (batch.length) {
        await tx
          .createQueryBuilder()
          .update(OutboxEvent)
          .set({ nextAttemptAt: () => "now() + interval '30 seconds'" })
          .whereInIds(batch.map((r) => r.id))
          .execute();
      }

      return batch;
    });
  }

  private async publishBatch(rows: OutboxEvent[]): Promise<void> {
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
          row.eventType,
          Buffer.from(JSON.stringify(this.toEnvelope(row))),
          { contentType: 'application/json', persistent: true, messageId: row.eventId },
        );
        await ch.waitForConfirms();
        await this.outbox.update({ id: row.id }, { status: 'published', publishedAt: new Date(), lastError: null });
      } catch (err) {
        await this.markFailed(row, this.message(err));
      }
    }

    await this.close(ch, conn);
  }

  private toEnvelope(row: OutboxEvent) {
    return {
      event_id: row.eventId,
      event_type: row.eventType,
      version: '1',
      occurred_at: row.occurredAt.toISOString(),
      correlation_id: row.correlationId,
      producer: 'wassimo-payment',
      payload: row.payload,
    };
  }

  private async markFailed(row: OutboxEvent, error: string): Promise<void> {
    const attempts = row.attempts + 1;
    const delay = Math.min(300, 2 ** attempts);
    await this.outbox.query(
      `UPDATE outbox_events
          SET status = 'pending', attempts = $2, last_error = $3,
              next_attempt_at = now() + ($4::int * interval '1 second')
        WHERE id = $1`,
      [row.id, attempts, error.slice(0, 500), delay],
    );
  }

  private async close(ch?: amqp.ConfirmChannel, conn?: amqp.ChannelModel): Promise<void> {
    try { await ch?.close(); } catch {}
    try { await conn?.close(); } catch {}
  }

  private message(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
