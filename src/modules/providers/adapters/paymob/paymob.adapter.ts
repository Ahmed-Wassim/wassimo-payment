import { createHmac, timingSafeEqual } from 'crypto';
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

export class PaymobAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paymob;

  constructor(
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: { account: ProviderAccount; credentials: Record<string, string> } | null,
  ) {}

  capabilities(): AdapterCapabilities {
    return { methods: ['card'], operations: ['charge'], environments: ['test'] };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const config = (this.bound.account.config ?? {}) as Record<string, any>;
    const creds = this.bound.credentials;

    const customer = input.customerDetails!;
    const parts = customer.name.trim().split(/\s+/);
    const first_name = parts[0] || 'NA';
    const last_name = parts.slice(1).join(' ') || '.';
    const amount = Number(input.amountMinor);
    const integrationId = (config.integration_ids as any)?.[input.method];

    const res = await fetch(`${String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '')}/v1/intention/`, {
      method: 'POST',
      headers: { Authorization: `Token ${creds.secret_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: input.currency.toUpperCase(),
        payment_methods: [integrationId],
        items: [{ name: `payment ${input.paymentId}`.slice(0, 50), amount, quantity: 1 }],
        billing_data: {
          first_name,
          last_name,
          email: customer.email,
          phone_number: customer.phone || 'NA',
          street: customer.street || 'NA',
          city: customer.city || 'NA',
          state: customer.state || 'NA',
          country: (customer.country || 'NA').toUpperCase(),
        },
        special_reference: input.paymentId,
        notification_url: config.notification_url,
        redirection_url: config.redirection_url,
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new ProviderConfigError(`paymob intention: ${res.status}`);

    const checkoutBase = String(config.checkout_base_url || 'https://eg.checkout.paymob.com/').replace(/\/?$/, '/');
    return {
      providerReference: String(data.intention_order_id),
      redirectUrl: `${checkoutBase}?publicKey=${encodeURIComponent(creds.public_key)}&clientSecret=${encodeURIComponent(data.client_secret)}`,
    };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const ctx = await this.context(providerReference);
    const baseUrl = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');

    const tokenRes = await fetch(`${baseUrl}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: ctx.credentials.api_key }),
    });
    const tokenData = (await tokenRes.json()) as any;

    const inquiryRes = await fetch(`${baseUrl}/api/ecommerce/orders/transaction_inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: tokenData.token, order_id: providerReference }),
    });
    const tx = (await inquiryRes.json()) as any;

    if (tx.success && !tx.pending) return { result: 'succeeded' };
    if (!tx.success && !tx.pending) return { result: 'failed' };
    return { result: 'unknown' };
  }

  async verifyWebhook(
    _headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    const hmac = Array.isArray(query.hmac) ? query.hmac[0] : query.hmac;
    if (!hmac) return null;

    const body = JSON.parse(rawBody.toString('utf8')) as any;
    const tx = body.obj;
    if (!tx?.order?.id) return null;

    const providerReference = String(tx.order.id);
    const attempt = await this.attempts.findOne({ where: { providerReference } });
    if (!attempt) return null;
    const creds = await this.credentialsService.load(attempt.providerAccountId);

    const source = tx.source_data || {};
    const values = [
      tx.amount_cents, tx.created_at, tx.currency, tx.error_occured,
      tx.has_parent_transaction, tx.id, tx.integration_id, tx.is_3d_secure,
      tx.is_auth, tx.is_capture, tx.is_refunded, tx.is_standalone_payment,
      tx.is_voided, tx.order.id, tx.owner, tx.pending,
      source.pan, source.sub_type, source.type, tx.success,
    ];
    const concatenated = values.map((v) => (v === true ? 'true' : v === false ? 'false' : v == null ? '' : String(v))).join('');
    const expected = createHmac('sha512', creds.hmac_secret).update(concatenated).digest('hex');
    try {
      if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))) return null;
    } catch {
      return null;
    }

    let result: 'succeeded' | 'failed' | 'pending' | 'unknown' = 'unknown';
    if (tx.success && !tx.pending) result = 'succeeded';
    else if (!tx.success && !tx.pending) result = 'failed';
    else if (tx.pending) result = 'pending';

    return {
      providerEventId: tx.id != null ? String(tx.id) : null,
      eventType: `transaction.${result}`,
      result,
      providerReference,
      raw: body,
    };
  }

  private async context(providerReference: string) {
    if (this.bound) return { config: (this.bound.account.config ?? {}) as any, credentials: this.bound.credentials };
    const attempt = await this.attempts.findOne({ where: { providerReference } });
    const account = await this.accounts.findOne({ where: { id: attempt!.providerAccountId } });
    const credentials = await this.credentialsService.load(account!.id);
    return { config: (account!.config ?? {}) as any, credentials };
  }
}

