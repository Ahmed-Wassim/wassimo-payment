import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { PaymentAttempt } from '../../../payments/entities/payment-attempt.entity.ts';
import { ProviderAccount } from '../../entities/provider-account.entity.ts';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  ProviderConfigError,
} from '../../adapter/adapter.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { ProviderCredentialService } from '../../provider-credential.service.ts';

export class FawaterakAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Fawaterak;

  constructor(
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: { account: ProviderAccount; credentials: Record<string, string> } | null,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    throw new ProviderConfigError('fawaterak: not implemented');
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    return { result: 'unknown' };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    return null;
  }
}
