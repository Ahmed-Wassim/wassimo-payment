import { Injectable } from '@nestjs/common';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  PROVIDER_RESULT,
  RefundInput,
  RefundResult,
  ProviderTimeoutError,
} from '../../adapter.ts';
import { PROVIDER_CODE } from '../../../provider-code.ts';
import { MockHostedService, MockWebhookPayload } from './mock-hosted.service.ts';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class MockAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Mock;

  constructor(private readonly hosted: MockHostedService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = this.hosted.openSession(
      input.paymentId,
      input.amountMinor,
      input.currency,
      input.method,
      input.customerDetails ?? null,
    );
    return {
      providerReference: session.sessionRef,
      redirectUrl: `/mock/hosted/${session.sessionRef}`,
    };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const session = this.hosted.get(providerReference);
    if (!session || session.outcome === PROVIDER_RESULT.PENDING) {
      return { result: PROVIDER_RESULT.UNKNOWN };
    }
    return { result: session.outcome };
  }

  async queryRefundStatus(refundReference: string): Promise<Outcome> {
    return this.queryStatus(refundReference);
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const session = this.hosted.openRefundSession(
      input.paymentId,
      input.providerReference,
      input.amountMinor,
      input.currency,
    );
    if (session.lost) {
      throw new ProviderTimeoutError(
        'mock refund response lost (MOCK_REFUND_MODE=lost-response)',
        session.sessionRef,
      );
    }
    return {
      providerRef: session.sessionRef,
      result: PROVIDER_RESULT.SUCCEEDED,
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<ProviderEvent | null> {
    const signature =
      headers['x-mock-signature'] ?? headers['X-Mock-Signature'];
    if (!signature) {
      return null;
    }

    let body: MockWebhookPayload;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as MockWebhookPayload;
    } catch {
      return null;
    }

    const secret = this.hosted.webhookSecret();
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (
      signatureBuf.length !== expectedBuf.length ||
      !timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      return null;
    }

    const result =
      body.result === PROVIDER_RESULT.SUCCEEDED ||
      body.result === PROVIDER_RESULT.FAILED ||
      body.result === PROVIDER_RESULT.PENDING ||
      body.result === PROVIDER_RESULT.UNKNOWN
        ? body.result
        : PROVIDER_RESULT.UNKNOWN;

    return {
      providerEventId: body.event_id ?? null,
      eventType: body.event ?? 'charge.unknown',
      result,
      providerReference: body.provider_reference ?? null,
      raw: body,
    };
  }
}
