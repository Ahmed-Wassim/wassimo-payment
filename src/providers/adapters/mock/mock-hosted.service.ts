import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';

export type MockOutcome = 'pending' | 'succeeded' | 'failed';
export type MockButton = 'approve' | 'decline' | 'approve-lost';

export interface MockSession {
  sessionRef: string;
  paymentId: string;
  amountMinor: bigint;
  currency: string;
  method: string;
  outcome: MockOutcome;
  webhookDelivered: boolean;
}

@Injectable()
export class MockHostedService {
  private readonly sessions = new Map<string, MockSession>();
  private readonly secret = 'mock-dev-secret';

  webhookSecret(): string {
    return this.secret;
  }

  openSession(
    paymentId: string,
    amountMinor: bigint,
    currency: string,
    method: string,
  ): MockSession {
    const sessionRef = 'mock_' + randomBytes(6).toString('hex');
    const session: MockSession = {
      sessionRef,
      paymentId,
      amountMinor,
      currency,
      method,
      outcome: 'pending',
      webhookDelivered: false,
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
