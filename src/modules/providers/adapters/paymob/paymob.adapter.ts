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
  RefundInput,
  RefundResult,
} from '../../adapter/adapter.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { ProviderCredentialService } from '../../provider-credential.service.ts';

export class PaymobAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paymob;

  private authTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: { account: ProviderAccount; credentials: Record<string, string> } | null,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const config = (this.bound.account.config ?? {}) as Record<string, any>;
    const creds = this.bound.credentials;

    const amount = Number(input.amountMinor);
    const integrationId = Number((config.integration_ids as any)?.[input.method]);
    if (!Number.isInteger(integrationId) || integrationId <= 0) {
      throw new ProviderConfigError(`paymob: no integration id configured for method '${input.method}'`);
    }

    const res = await fetch(`${String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '')}/v1/intention/`, {
      method: 'POST',
      headers: { Authorization: `Token ${creds.secret_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: input.currency.toUpperCase(),
        payment_methods: [Number(integrationId)],
        items: [{ name: `payment ${input.paymentId}`.slice(0, 50), amount, quantity: 1 }],
        billing_data: this.billingData(input.customerDetails!),
        special_reference: input.paymentId,
        notification_url: config.notification_url,
        redirection_url: config.redirection_url,
      }),
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new ProviderConfigError(`paymob intention: ${res.status}`);

    return {
      providerReference: String(data.intention_order_id),
      redirectUrl: this.checkoutUrl(config, creds.public_key, data.client_secret),
    };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const ctx = await this.context(providerReference);
    const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');

    const token = await this.authToken(base, ctx.credentials.api_key);
    const tx = await this.inquiry(base, token, providerReference);

    const result = this.txResult(tx);
    return { result: result === 'pending' ? 'unknown' : result };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const ctx = await this.context(input.providerReference);
    const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
    const token = await this.authToken(base, ctx.credentials.api_key);

    // Look up the transaction to get the transaction id
    const tx = await this.inquiry(base, token, input.providerReference);
    const transactionId = tx?.id;
    if (!transactionId) {
      throw new ProviderConfigError('paymob refund: transaction id not found');
    }

    const amountCents = Number(input.amountMinor);
    const res = await fetch(`${base}/api/acceptance/void_refund/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        transaction_id: transactionId,
        amount_cents: amountCents,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) {
      throw new ProviderConfigError(`paymob refund: ${res.status} ${data?.message || ''}`);
    }
    return { providerRef: String(data?.id || transactionId) };
  }

  private txResult(tx: any): 'succeeded' | 'failed' | 'pending' | 'unknown' {
    if (tx.success && !tx.pending) return 'succeeded';
    if (!tx.success && !tx.pending) return 'failed';
    if (tx.pending) return 'pending';
    return 'unknown';
  }

  private hmacData(tx: any): string {
    const s = tx.source_data || {};
    return [
      tx.amount_cents, tx.created_at, tx.currency, tx.error_occured,
      tx.has_parent_transaction, tx.id, tx.integration_id, tx.is_3d_secure,
      tx.is_auth, tx.is_capture, tx.is_refunded, tx.is_standalone_payment,
      tx.is_voided, tx.order.id, tx.owner, tx.pending,
      s.pan, s.sub_type, s.type, tx.success,
    ].map((v) => (v === true ? 'true' : v === false ? 'false' : v == null ? '' : String(v))).join('');
  }

  private billingData(customer: any) {
    const parts = String(customer.name || '').trim().split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ');
    return {
      first_name,
      last_name,
      email: customer.email,
      phone_number: customer.phone || 'NA',
      street: customer.street || 'NA',
      city: customer.city || 'NA',
      state: customer.state || 'NA',
      country: this.countryName(customer.country) || 'NA',
    };
  }

  private countryName(code: string | null | undefined): string {
    const map: Record<string, string> = {
      EG: 'Egypt', SA: 'Saudi Arabia', AE: 'United Arab Emirates', KW: 'Kuwait',
      BH: 'Bahrain', OM: 'Oman', QA: 'Qatar', JO: 'Jordan', LB: 'Lebanon',
      MA: 'Morocco', TN: 'Tunisia', DZ: 'Algeria', US: 'United States',
      GB: 'United Kingdom', DE: 'Germany', FR: 'France',
    };
    const upper = String(code || '').toUpperCase();
    return map[upper] || upper || 'NA';
  }

  private checkoutUrl(config: any, publicKey: string, clientSecret: string): string {
    const base = String(config.checkout_base_url || 'https://eg.checkout.paymob.com/').replace(/\/?$/, '/');
    return `${base}?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
  }

  private async authToken(base: string, apiKey: string): Promise<string> {
    const now = Date.now();
    if (this.authTokenCache && this.authTokenCache.expiresAt > now) {
      return this.authTokenCache.token;
    }
    const res = await fetch(`${base}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const data = (await res.json()) as any;
    this.authTokenCache = { token: data.token, expiresAt: now + 50 * 60 * 1000 };
    return data.token;
  }

  private async inquiry(base: string, token: string, orderId: string): Promise<any> {
    const res = await fetch(`${base}/api/ecommerce/orders/transaction_inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: token, order_id: orderId }),
    });
    return res.json() as any;
  }

  private validHmac(tx: any, secret: string, received: string): boolean {
    const expected = createHmac('sha512', secret).update(this.hmacData(tx)).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    } catch {
      return false;
    }
  }

  async verifyWebhook(
    _headers: Record<string, string>,
    rawBody: Buffer,
    query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    const hmac = Array.isArray(query.hmac) ? query.hmac[0] : query.hmac;
    if (!hmac) return null;

    let body: any;
    try { body = JSON.parse(rawBody.toString('utf8')); } catch { return null; }
    const tx = body.obj;
    if (!tx?.order?.id) return null;

    const providerReference = String(tx.order.id);
    const attempt = await this.attempts.findOne({ where: { providerReference } });
    if (!attempt) return null;
    const creds = await this.credentialsService.load(attempt.providerAccountId).catch(() => null);
    if (!creds?.hmac_secret) return null;

    if (!this.validHmac(tx, creds.hmac_secret, hmac)) return null;

    // Trust anchor: re-query the transaction to confirm status
    try {
      const ctx = await this.context(providerReference);
      const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
      const authToken = await this.authToken(base, ctx.credentials.api_key);
      const inquired = await this.inquiry(base, authToken, providerReference);
      if (inquired) {
        const inquiredResult = this.txResult(inquired);
        if (inquiredResult !== 'unknown') {
          return { providerEventId: tx.id != null ? String(tx.id) : null, eventType: `transaction.${inquiredResult}`, result: inquiredResult, providerReference, raw: body };
        }
      }
    } catch {
      // fall through to HMAC-verified result
    }

    const result = this.txResult(tx);
    return { providerEventId: tx.id != null ? String(tx.id) : null, eventType: `transaction.${result}`, result, providerReference, raw: body };
  }

  private async context(providerReference: string) {
    if (this.bound) return { config: (this.bound.account.config ?? {}) as any, credentials: this.bound.credentials };
    const attempt = await this.attempts.findOne({ where: { providerReference } });
    const account = await this.accounts.findOne({ where: { id: attempt!.providerAccountId } });
    const credentials = await this.credentialsService.load(account!.id);
    return { config: (account!.config ?? {}) as any, credentials };
  }
}

