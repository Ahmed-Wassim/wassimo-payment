import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { APP_CONFIG } from '../../../../config/config.module.ts';
import type { AppConfig } from '../../../../config/configuration.ts';
import type { CheckoutCustomer } from '../../adapter/adapter.ts';

export type MockOutcome = 'pending' | 'succeeded' | 'failed';
export type MockButton = 'approve' | 'decline' | 'approve-lost';

export interface MockWebhookPayload {
  event_id?: string;
  event?: string;
  provider_reference?: string;
  result?: string;
}

export interface MockSession {
  sessionRef: string;
  paymentId: string;
  amountMinor: bigint;
  currency: string;
  method: string;
  customer: CheckoutCustomer | null;
  outcome: MockOutcome;
  webhookDelivered: boolean;
  webhookSecret: string;
}

@Injectable()
export class MockHostedService {
  private readonly sessions = new Map<string, MockSession>();
  private readonly secret: string;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    this.secret = config.mock.webhookSecret;
  }

  webhookSecretFor(sessionRef: string): string {
    return this.sessions.get(sessionRef)?.webhookSecret ?? this.secret;
  }

  openSession(
    paymentId: string,
    amountMinor: bigint,
    currency: string,
    method: string,
    customer: CheckoutCustomer | null,
    webhookSecret = this.secret,
  ): MockSession {
    const sessionRef = 'mock_' + randomBytes(6).toString('hex');
    const session: MockSession = {
      sessionRef,
      paymentId,
      amountMinor,
      currency,
      method,
      customer,
      outcome: 'pending',
      webhookDelivered: false,
      webhookSecret,
    };
    this.sessions.set(sessionRef, session);
    return session;
  }

  completeOutcome(sessionRef: string, button: MockButton): MockSession {
    const session = this.sessions.get(sessionRef);
    if (!session) {
      throw new NotFoundException(`unknown hosted session ${sessionRef}`);
    }

    session.outcome = button === 'decline' ? 'failed' : 'succeeded';
    session.webhookDelivered = button !== 'approve-lost';
    return session;
  }

  get(sessionRef: string): MockSession | undefined {
    return this.sessions.get(sessionRef);
  }
}
