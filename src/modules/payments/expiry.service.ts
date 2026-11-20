import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { APP_CONFIG } from '../../config/config.module.ts';
import type { AppConfig } from '../../config/configuration.ts';
import { OutboxService } from '../../outbox/outbox.service.ts';

@Injectable()
export class ExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiryService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly ttlSeconds: number;
  private readonly sweepSeconds: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) cfg: AppConfig,
  ) {
    this.ttlSeconds = cfg.expiry.ttlSeconds;
    this.sweepSeconds = cfg.expiry.sweepSeconds;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => void this.sweep(), this.sweepSeconds * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<number> {
    try {
      const expired = await this.dataSource.transaction(async (tx) => {
        const rows = (await tx.query(
          `UPDATE payments
              SET status = 'expired', updated_at = NOW()
            WHERE status = 'created'
              AND created_at < NOW() - ($1::int * interval '1 second')
              AND NOT EXISTS (
                   SELECT 1 FROM payment_attempts a
                    WHERE a.payment_id = payments.id)
            RETURNING id, reference`,
          [this.ttlSeconds],
        )) as { id: string; reference: string }[];

        for (const row of rows) {
          await this.outbox.writeFailed(
            tx,
            { id: row.id, reference: row.reference },
            { reason_code: 'expired' },
          );
        }

        return rows;
      });

      if (expired.length > 0) {
        this.logger.log(`expired ${expired.length} abandoned uncharged payment(s)`);
      }
      return expired.length;
    } catch (err) {
      this.logger.error('expiry sweep failed', err instanceof Error ? err.stack : String(err));
      return 0;
    }
  }
}
