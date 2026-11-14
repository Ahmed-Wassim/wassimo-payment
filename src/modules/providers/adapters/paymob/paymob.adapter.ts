import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentAttempt } from '../../../payments/entities/payment-attempt.entity.ts';
import { ProviderAccount } from '../../entities/provider-account.entity.ts';
import {
  AdapterCapabilities,
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  ProviderConfigError,
} from '../../adapter.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { ProviderCredentialService } from '../../provider-credential.service.ts';

type PaymobBound = {
  account: ProviderAccount;
  credentials: Record<string, string>;
};

@Injectable()
export class PaymobAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paymob;

  constructor(
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: PaymobBound | null,
  ) {}

  capabilities(): AdapterCapabilities {
    return {
      methods: ['card'],
      operations: ['charge'],
      environments: ['test'],
    };
  }

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    throw new ProviderConfigError('paymob adapter not implemented yet');
  }

  async queryStatus(_providerReference: string): Promise<Outcome> {
    return { result: 'unknown' };
  }

  async verifyWebhook(
    _headers: Record<string, string>,
    _rawBody: Buffer,
    _query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    return null;
  }
}
