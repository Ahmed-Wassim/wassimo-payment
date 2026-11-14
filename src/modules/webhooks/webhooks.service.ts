import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiError } from '../../common/api-error.ts';
import { PaymentProviderFactory } from '../providers/factories/payment-provider.factory.ts';
import { attemptTransition } from '../payments/attempt-states.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { Payment } from '../payments/entities/payment.entity.ts';
import { transition } from '../payments/states.ts';
import { WebhookEvent } from './entities/webhook-event.entity.ts';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEvent)
    private readonly events: Repository<WebhookEvent>,
    @InjectRepository(PaymentAttempt)
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly factory: PaymentProviderFactory,
  ) {}

  async ingest(
    providerCode: string,
    headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<{ status: string }> {
    const adapter = await this.factory.forProviderCode(providerCode);

    const event = await adapter.verifyWebhook(headers, rawBody, query);
    if (!event) {
      throw new ApiError(
        'unauthorized',
        HttpStatus.UNAUTHORIZED,
        'invalid webhook signature',
      );
    }

    const attempt = event.providerReference
      ? await this.attempts.findOne({
          where: { providerReference: event.providerReference },
        })
      : null;

    let row: WebhookEvent | null;
    if (event.providerEventId) {
      row = await this.insertDedupeRow({
        providerAccountId: attempt ? attempt.providerAccountId : null,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        rawPayload: event.raw as Record<string, unknown>,
      });
    } else {
      row = await this.events.save({
        providerAccountId: attempt ? attempt.providerAccountId : null,
        providerEventId: null,
        eventType: event.eventType,
        rawPayload: event.raw as Record<string, unknown>,
        status: 'pending',
      });
    }

    if (row === null) {
      return { status: 'duplicate' };
    }

    const target =
      event.result === 'succeeded' || event.result === 'failed'
        ? event.result
        : null;

    const status = await this.applyEvent(row.id, attempt, target);
    return { status };
  }

  private async insertDedupeRow(event: {
    providerAccountId: string | null;
    providerEventId: string;
    eventType: string;
    rawPayload: Record<string, unknown>;
  }): Promise<WebhookEvent | null> {
    const inserted: { id: string }[] = await this.events.query(
      `INSERT INTO webhook_events
          (provider_account_id, provider_event_id, event_type, raw_payload, status)
        VALUES ($1, $2, $3, $4::jsonb, 'pending')
        ON CONFLICT DO NOTHING
        RETURNING id`,
      [
        event.providerAccountId,
        event.providerEventId,
        event.eventType,
        JSON.stringify(event.rawPayload),
      ],
    );

    if (inserted.length) {
      return this.events.findOneByOrFail({ id: inserted[0].id });
    }

    const existing: Array<{ id: string; status: string }> =
      await this.events.query(
        `SELECT id, status FROM webhook_events
          WHERE provider_event_id = $1
            AND provider_account_id IS NOT DISTINCT FROM $2
          ORDER BY received_at
          LIMIT 1`,
        [event.providerEventId, event.providerAccountId],
      );

    if (existing.length && existing[0].status === 'pending') {
      return this.events.findOneByOrFail({ id: existing[0].id });
    }

    return null;
  }

  private async applyEvent(
    rowId: string,
    attempt: PaymentAttempt | null,
    target: 'succeeded' | 'failed' | null,
  ): Promise<string> {
    if (!attempt || !target) {
      const reason = !attempt ? 'unmatched_reference' : 'event_carries_no_outcome';
      await this.events.update(
        { id: rowId },
        { status: 'ignored', error: reason, processedAt: new Date() },
      );
      return 'ignored';
    }

    return this.events.manager.transaction(async (tx) => {
      const attemptRow = await tx.findOneByOrFail(PaymentAttempt, { id: attempt.id });
      const payment = await tx.findOneByOrFail(Payment, { id: attemptRow.paymentId });
      const refusals: string[] = [];

      if (attemptRow.status !== target) {
        try {
          attemptTransition(attemptRow.status, target);
          await tx.update(PaymentAttempt, { id: attemptRow.id }, { status: target });
        } catch {
          refusals.push(`attempt '${attemptRow.status}' refuses '${target}'`);
        }
      }

      if (payment.status !== target) {
        try {
          let current = payment.status;
          if (current === 'created') {
            transition('created', 'processing');
            await tx.update(Payment, { id: payment.id }, { status: 'processing' });
            current = 'processing';
          }
          transition(current, target);
          if (target === 'succeeded') {
            await tx.update(Payment, { id: payment.id }, {
              status: target,
              capturedMinor: payment.amountMinor,
            });
          } else {
            await tx.update(Payment, { id: payment.id }, { status: target });
          }
        } catch {
          refusals.push(`payment '${payment.status}' refuses '${target}'`);
        }
      }

      const status = refusals.length ? 'ignored' : 'processed';
      await tx.update(WebhookEvent, { id: rowId }, {
        status,
        error: refusals.length ? refusals.join('; ') : null,
        processedAt: new Date(),
      });

      return status;
    });
  }
}