import { createHmac, timingSafeEqual } from 'crypto';
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
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    const receivedHmac = this.queryValue(query, 'hmac');
    if (!receivedHmac) return null;

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }

    const obj = body.obj;
    if (!obj || typeof obj !== 'object') return null;
    const tx = obj as Record<string, unknown>;

    const order = tx.order as Record<string, unknown> | undefined;
    const orderId = order && typeof order === 'object' ? order.id : undefined;
    const providerReference =
      typeof orderId === 'string' || typeof orderId === 'number' ? String(orderId) : null;
    if (!providerReference) return null;

    const attempt = await this.attempts.findOne({ where: { providerReference } });
    if (!attempt) return null;

    let hmacSecret: string | undefined;
    try {
      const creds = await this.credentialsService.load(attempt.providerAccountId);
      hmacSecret = creds.hmac_secret;
    } catch {
      return null;
    }
    if (!hmacSecret) return null;

    const concatenated = this.hmacConcatenated(tx);
    const expected = createHmac('sha512', hmacSecret).update(concatenated).digest('hex');
    const receivedBuf = Buffer.from(receivedHmac);
    const expectedBuf = Buffer.from(expected);
    if (receivedBuf.length !== expectedBuf.length || !timingSafeEqual(receivedBuf, expectedBuf)) {
      return null;
    }

    const txId = tx.id;
    const providerEventId =
      typeof txId === 'string' || typeof txId === 'number' ? String(txId) : null;
    const result = this.mapResult(tx);

    return {
      providerEventId,
      eventType: `transaction.${result}`,
      result,
      providerReference,
      raw: body,
    };
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

  private queryValue(
    query: Record<string, string | string[] | undefined>,
    key: string,
  ): string | undefined {
    const value = query[key];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private hmacConcatenated(tx: Record<string, unknown>): string {
    const source = (tx.source_data ?? {}) as Record<string, unknown>;
    const order = (tx.order ?? {}) as Record<string, unknown>;
    const values = [
      tx.amount_cents,
      tx.created_at,
      tx.currency,
      tx.error_occured,
      tx.has_parent_transaction,
      tx.id,
      tx.integration_id,
      tx.is_3d_secure,
      tx.is_auth,
      tx.is_capture,
      tx.is_refunded,
      tx.is_standalone_payment,
      tx.is_voided,
      order.id,
      tx.owner,
      tx.pending,
      source.pan,
      source.sub_type,
      source.type,
      tx.success,
    ];
    return values.map((v) => this.hmacValue(v)).join('');
  }

  private hmacValue(value: unknown): string {
    if (value === true) return 'true';
    if (value === false) return 'false';
    if (value === null || value === undefined) return '';
    return String(value);
  }

  private mapResult(tx: Record<string, unknown>): 'succeeded' | 'failed' | 'pending' | 'unknown' {
    const success = tx.success === true;
    const pending = tx.pending === true;
    if (success && !pending) return 'succeeded';
    if (!success && !pending) return 'failed';
    if (pending) return 'pending';
    return 'unknown';
  }
}
