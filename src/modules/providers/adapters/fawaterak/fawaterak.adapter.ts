import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { CurrenciesService } from '../../../currencies/currencies.service.ts';
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
    private readonly currencies: CurrenciesService,
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: { account: ProviderAccount; credentials: Record<string, string> } | null,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.bound) throw new ProviderConfigError('fawaterak: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const creds = this.bound.credentials;
    const currency = await this.currencies.requireEnabled(input.currency);
    const amount = Number(this.currencies.minorToDecimal(input.amountMinor, currency.exponent));
    const baseUrl = this.baseUrl(config);
    const token = await this.accessToken(baseUrl, creds);

    const customer = this.customer(input.customerDetails!);
    const body = {
      cartTotal: amount,
      currency: input.currency.toUpperCase(),
      customer,
      cartItems: [{ name: `payment ${input.paymentId}`.slice(0, 50), price: amount, quantity: 1 }],
      redirectionUrls: {
        successUrl: config.success_url,
        failUrl: config.fail_url,
        pendingUrl: config.pending_url,
        webhookUrl: config.webhook_url,
      },
      pay_load: { payment_id: input.paymentId },
    };

    const res = await fetch(`${baseUrl}/api/v3/createTransaction`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) throw new ProviderConfigError(`fawaterak createTransaction: ${res.status}`);

    const intentKey = data?.data?.intent_key;
    const url = data?.data?.url || data?.data?.payment_data?.redirectTo;
    if (!intentKey || !url) {
      throw new ProviderConfigError('fawaterak: missing intent_key or url');
    }
    return { providerReference: String(intentKey), redirectUrl: String(url) };
  }

  private customer(details: any) {
    const parts = String(details?.name || '').trim().split(/\s+/).filter(Boolean);
    return {
      first_name: parts[0] || 'NA',
      last_name: parts.slice(1).join(' ') || '.',
      email: details?.email,
      phone: details?.phone,
      address: details?.street,
    };
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

  private baseUrl(config: any): string {
    return String(config?.base_url || 'https://staging.fawaterk.com').replace(/\/$/, '');
  }

  private async accessToken(baseUrl: string, credentials: Record<string, string>): Promise<string> {
    const res = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !data?.access_token) {
      throw new ProviderConfigError('fawaterak: failed to obtain access token');
    }
    return data.access_token;
  }
}
