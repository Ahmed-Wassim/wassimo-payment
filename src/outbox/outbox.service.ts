import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxEvent } from './entities/outbox-event.entity.ts';
import { randomUUID } from 'crypto';
import {
  PAYMENT_FAILED_EVENT,
  PAYMENT_SUCCEEDED_EVENT,
} from '../events/envelope.ts';

type SucceededPayment = {
  id: string;
  reference: string;
  currency: string;
  amountMinor: string;
  capturedMinor: string;
};

type FailedPayment = {
  id: string;
  reference: string;
};

@Injectable()
export class OutboxService {
  async writeSucceeded(tx: EntityManager, payment: SucceededPayment): Promise<void> {
    const amountMinor = Number(payment.capturedMinor || payment.amountMinor);
    await tx.insert(OutboxEvent, {
      eventId: randomUUID(),
      eventType: PAYMENT_SUCCEEDED_EVENT,
      payload: {
        payment_id: payment.id,
        reference: payment.reference,
        amount_minor: amountMinor,
        currency: payment.currency,
      },
      correlationId: payment.reference ?? payment.id,
      occurredAt: new Date(),
      status: 'pending',
      attempts: 0,
    });
  }

  async writeFailed(
    tx: EntityManager,
    payment: FailedPayment,
    reasonCode?: string,
  ): Promise<void> {
    await tx.insert(OutboxEvent, {
      eventId: randomUUID(),
      eventType: PAYMENT_FAILED_EVENT,
      payload: {
        payment_id: payment.id,
        reference: payment.reference,
        ...(reasonCode ? { reason_code: reasonCode } : {}),
      },
      correlationId: payment.reference ?? payment.id,
      occurredAt: new Date(),
      status: 'pending',
      attempts: 0,
    });
  }
}
