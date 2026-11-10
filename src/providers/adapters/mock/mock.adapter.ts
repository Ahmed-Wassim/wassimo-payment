import { Injectable } from '@nestjs/common';
import {
  AdapterCapabilities,
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
} from '../../adapter.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { MockHostedService } from './mock-hosted.service.ts';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class MockAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Mock;

  constructor(private readonly hosted: MockHostedService) {}

  capabilities(): AdapterCapabilities {
    return {
      methods: ['card'],
      operations: ['charge'],
      environments: ['test'],
    };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const session = this.hosted.openSession(
      input.paymentId,
      input.amountMinor,
      input.currency,
      input.method,
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

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<ProviderEvent | null> {
    const signature =
      headers['x-mock-signature'] ?? headers['X-Mock-Signature'];
    if (!signature) {
      return null;
    }

    const expected = createHmac('sha256', this.hosted.webhookSecret())
      .update(rawBody)
      .digest('hex');

    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (
      signatureBuf.length !== expectedBuf.length ||
      !timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      return null;
    }

    const body = JSON.parse(rawBody.toString('utf8')) as {
      event_id?: string;
      event?: string;
      provider_reference?: string;
      result?: string;
    };

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
