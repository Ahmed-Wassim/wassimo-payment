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

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const { account, credentials } = this.requireBound();
    const config = (account.config ?? {}) as Record<string, unknown>;

    const secretKey = this.requireCredential(credentials, 'secret_key');
    const publicKey = this.requireCredential(credentials, 'public_key');
    this.requireCredential(credentials, 'hmac_secret');
    this.requireCredential(credentials, 'api_key');

    const integrationId = this.integrationIdFor(config, input.method);
    const baseUrl = this.stringConfig(config, 'base_url', 'https://accept.paymob.com');
    const checkoutBaseUrl = this.stringConfig(
      config,
      'checkout_base_url',
      'https://eg.checkout.paymob.com/',
    );
    const notificationUrl = this.stringConfig(config, 'notification_url');
    const redirectionUrl = this.stringConfig(config, 'redirection_url');

    const customer = input.customerDetails;
    if (!customer?.name || !customer?.email) {
      throw new ProviderConfigError('paymob: customer_details with name and email required');
    }
    const { firstName, lastName } = this.splitName(customer.name);

    const amount = Number(input.amountMinor);
    const currency = input.currency.toUpperCase();
    const body: Record<string, unknown> = {
      amount,
      currency,
      payment_methods: [integrationId],
      items: [
        {
          name: `payment ${input.paymentId}`.slice(0, 50),
          amount,
          quantity: 1,
        },
      ],
      billing_data: {
        first_name: firstName,
        last_name: lastName,
        email: customer.email,
        phone_number: customer.phone ?? 'NA',
        street: customer.street ?? 'NA',
        city: customer.city ?? 'NA',
        state: customer.state ?? 'NA',
        country: (customer.country ?? 'NA').toUpperCase(),
        apartment: 'NA',
        floor: 'NA',
        building: 'NA',
      },
      special_reference: input.paymentId,
      notification_url: notificationUrl,
      redirection_url: redirectionUrl,
    };

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/intention/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    let data: Record<string, unknown>;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new ProviderConfigError(`paymob intention: unparseable response (${response.status})`);
    }
    if (!response.ok) {
      throw new ProviderConfigError(`paymob intention: HTTP ${response.status}`);
    }

    const clientSecret = typeof data.client_secret === 'string' ? data.client_secret : null;
    const orderId = data.intention_order_id;
    if (!clientSecret || (typeof orderId !== 'string' && typeof orderId !== 'number')) {
      throw new ProviderConfigError('paymob intention: missing client_secret or intention_order_id');
    }

    const base = checkoutBaseUrl.includes('?') ? checkoutBaseUrl : `${checkoutBaseUrl.replace(/\/$/, '')}/`;
    const redirectUrl = `${base}?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
    return { providerReference: String(orderId), redirectUrl };
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

  private requireBound(): PaymobBound {
    if (!this.bound) {
      throw new ProviderConfigError('paymob adapter requires a bound account');
    }
    return this.bound;
  }

  private requireCredential(credentials: Record<string, string>, key: string): string {
    const value = credentials[key];
    if (!value) {
      throw new ProviderConfigError(`paymob: missing credential ${key}`);
    }
    return value;
  }

  private stringConfig(config: Record<string, unknown>, key: string, fallback?: string): string {
    const value = config[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (fallback !== undefined) return fallback;
    throw new ProviderConfigError(`paymob: missing config ${key}`);
  }

  private integrationIdFor(config: Record<string, unknown>, method: string): number | string {
    const map = config.integration_ids;
    if (!map || typeof map !== 'object') {
      throw new ProviderConfigError('paymob: missing config integration_ids');
    }
    const id = (map as Record<string, unknown>)[method];
    if (typeof id === 'number' || typeof id === 'string') return id;
    throw new ProviderConfigError(`paymob: no integration id for method ${method}`);
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: 'NA', lastName: 'NA' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '.' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
}
