import { Injectable } from '@nestjs/common';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  RefundInput,
  RefundResult,
  ProviderTimeoutError,
} from '../../adapter/adapter.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { MockHostedService, MockWebhookPayload } from './mock-hosted.service.ts';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class MockAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Mock;

  constructor(private readonly hosted: MockHostedService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const webhookSecret =
      typeof input.accountConfig?.hmacSecret === 'string'
        ? input.accountConfig.hmacSecret
        : undefined;
    const session = this.hosted.openSession(
      input.paymentId,
      input.amountMinor,
      input.currency,
      input.method,
      input.customerDetails ?? null,
      webhookSecret,
    );
    return {
      providerReference: session.sessionRef,
      redirectUrl: `/mock/hosted/${session.sessionRef}`,
    };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const session = this.hosted.get(providerReference);
    if (!session || session.outcome === 'pending') {
      return { result: 'unknown' };
    }
    return { result: session.outcome };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const session = this.hosted.openRefundSession(
      input.paymentId,
      input.providerReference,
      input.amountMinor,
      input.currency,
    );
    if (session.lost) {
      throw new ProviderTimeoutError('mock refund response lost (MOCK_REFUND_MODE=lost-response)');
    }
    return { providerRef: session.sessionRef };
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

    const secret = this.hosted.webhookSecretFor(body.provider_reference ?? '');
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
      body.result === 'succeeded' ||
      body.result === 'failed' ||
      body.result === 'pending' ||
      body.result === 'unknown'
        ? body.result
        : 'unknown';

    return {
      providerEventId: body.event_id ?? null,
      eventType: body.event ?? 'charge.unknown',
      result,
      providerReference: body.provider_reference ?? null,
      raw: body,
    };
  }
}
