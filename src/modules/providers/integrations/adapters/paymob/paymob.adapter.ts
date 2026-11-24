import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { PaymentAttempt } from '../../../../payments/entities/payment-attempt.entity.ts';
import { ProviderAccount } from '../../../accounts/entity/provider-account.entity.ts';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  ProviderConfigError,
  ProviderTimeoutError,
  ProviderResult,
  PROVIDER_RESULT,
  PROVIDER_REQUEST_TIMEOUT_MS,
  RefundInput,
  RefundResult,
} from '../../adapter.ts';
import { PROVIDER_CODE } from '../../../provider-code.ts';
import { ProviderCredentialService } from '../../../credentials/provider-credential.service.ts';
import { findAttemptForProvider } from '../../provider-attempt.lookup.ts';

export class PaymobAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paymob;

  constructor(
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
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

    if (input.method === 'mobile_wallet') {
      return this.createClassicWalletCheckout(input, config, creds, amount, integrationId);
    }

    let res: Response;
    try {
      res = await fetch(`${String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '')}/v1/intention/`, {
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
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderTimeoutError('paymob intention request');
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ProviderTimeoutError('paymob intention response');
    }
    if (!res.ok) throw new ProviderConfigError(`paymob intention: ${res.status}`);

    return {
      providerReference: String(data.intention_order_id),
      redirectUrl: this.checkoutUrl(config, creds.public_key, data.client_secret),
    };
  }

  private async createClassicWalletCheckout(
    input: CheckoutInput,
    config: Record<string, any>,
    creds: Record<string, string>,
    amount: number,
    integrationId: number,
  ): Promise<CheckoutResult> {
    const base = String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
    const authToken = await this.authToken(base, creds.api_key);
    const billing = this.billingData(input.customerDetails || {});

    let orderRes: Response;
    let order: any;
    try {
      orderRes = await fetch(`${base}/api/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: false,
          amount_cents: String(amount),
          currency: input.currency.toUpperCase(),
          merchant_order_id: input.paymentId,
          items: [],
        }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
      order = await orderRes.json();
    } catch {
      throw new ProviderTimeoutError('paymob wallet order request');
    }
    if (!orderRes.ok || !order?.id) {
      throw new ProviderConfigError(`paymob wallet order: ${orderRes.status}`);
    }

    const pkBilling = {
      apartment: 'NA',
      floor: 'NA',
      building: 'NA',
      shipping_method: 'NA',
      postal_code: String(input.customerDetails?.zip || 'NA'),
      ...billing,
    };
    let pkRes: Response;
    let pk: any;
    try {
      pkRes = await fetch(`${base}/api/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: String(amount),
          expiration: 3600,
          order_id: order.id,
          billing_data: pkBilling,
          currency: input.currency.toUpperCase(),
          integration_id: integrationId,
          lock_order_when_paid: false,
        }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
      pk = await pkRes.json();
    } catch {
      throw new ProviderTimeoutError(
        'paymob wallet payment key request',
        String(order.id),
      );
    }
    if (!pkRes.ok || !pk?.token) {
      throw new ProviderConfigError(`paymob wallet payment key: ${pkRes.status}`);
    }

    const identifier = String(input.customerDetails?.phone || '').trim();
    if (!identifier) {
      throw new ProviderConfigError('paymob wallet: customer phone number is required');
    }

    let payRes: Response;
    try {
      payRes = await fetch(`${base}/api/acceptance/payments/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: { identifier, subtype: 'WALLET' },
          payment_token: pk.token,
        }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderTimeoutError('paymob wallet payment request', String(order.id));
    }
    let pay: any;
    try {
      pay = await payRes.json();
    } catch {
      throw new ProviderTimeoutError(
        'paymob wallet payment response',
        String(order.id),
      );
    }
    if (!payRes.ok) {
      throw new ProviderConfigError(`paymob wallet pay: ${payRes.status}`);
    }
    const redirectUrl = pay.redirect_url || pay.iframe_redirection_url || pay.redirection_url;
    if (!redirectUrl) {
      throw new ProviderConfigError('paymob wallet: missing redirect url');
    }

    return {
      providerReference: String(order.id),
      redirectUrl: String(redirectUrl),
    };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const ctx = await this.context(providerReference);
    const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');

    const token = await this.authToken(base, ctx.credentials.api_key);
    const tx = await this.inquiry(base, token, providerReference);

    const result = this.txResult(tx);
    return {
      result: result === PROVIDER_RESULT.PENDING
        ? PROVIDER_RESULT.UNKNOWN
        : result,
    };
  }

  async queryStatusByPaymentId(paymentId: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const base = String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
    const token = await this.authToken(base, this.bound.credentials.api_key);
    const tx = await this.inquiryByMerchantOrderId(base, token, paymentId);

    const result = this.txResult(tx);
    return {
      result: result === PROVIDER_RESULT.PENDING
        ? PROVIDER_RESULT.UNKNOWN
        : result,
    };
  }

  async queryRefundStatus(refundReference: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const base = String(config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
    const token = await this.authToken(base, this.bound.credentials.api_key);
    let res: Response;
    try {
      res = await fetch(
        `${base}/api/acceptance/transactions/${encodeURIComponent(refundReference)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
        },
      );
    } catch {
      throw new ProviderTimeoutError('paymob refund inquiry');
    }
    const tx = (await res.json().catch(() => ({}))) as any;
    if (!res.ok) throw new ProviderConfigError(`paymob refund inquiry: ${res.status}`);
    if (!tx?.is_refund && !tx?.is_internal_refund) {
      return { result: PROVIDER_RESULT.UNKNOWN };
    }

    const result = this.txResult(tx);
    return {
      result: result === PROVIDER_RESULT.PENDING
        ? PROVIDER_RESULT.UNKNOWN
        : result,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.bound) throw new ProviderConfigError('paymob: not bound');
    const ctx = await this.context(input.providerReference);
    const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
    const token = await this.authToken(base, ctx.credentials.api_key);

    // Look up the transaction to get the transaction id
    const tx = await this.inquiry(base, token, input.providerReference);
    const transactionId = tx?.is_refund ? tx?.parent_transaction : tx?.id;
    if (!transactionId) {
      throw new ProviderConfigError('paymob refund: transaction id not found');
    }

    const amountCents = Number(input.amountMinor);
    let res: Response;
    let data: any;
    try {
      res = await fetch(`${base}/api/acceptance/void_refund/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          transaction_id: Number(transactionId),
          amount_cents: amountCents,
        }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
      data = await res.json();
    } catch {
      throw new ProviderTimeoutError('paymob refund request');
    }
    if (!res.ok) {
      throw new ProviderConfigError(`paymob refund: ${res.status} ${data?.message || ''}`);
    }
    const result = this.txResult(data);
    return {
      providerRef: data?.id != null ? String(data.id) : null,
      result: result === PROVIDER_RESULT.PENDING
        ? PROVIDER_RESULT.UNKNOWN
        : result,
    };
  }

  private txResult(tx: any): ProviderResult {
    if (tx.success && !tx.pending) return PROVIDER_RESULT.SUCCEEDED;
    if (!tx.success && !tx.pending) return PROVIDER_RESULT.FAILED;
    if (tx.pending) return PROVIDER_RESULT.PENDING;
    return PROVIDER_RESULT.UNKNOWN;
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
    const res = await fetch(`${base}/api/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
      signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
    });
    const data = (await res.json()) as any;
    if (!res.ok || !data?.token) {
      throw new ProviderConfigError(`paymob authentication: ${res.status}`);
    }
    return data.token;
  }

  private async inquiry(base: string, token: string, orderId: string): Promise<any> {
    return this.postInquiry(base, { auth_token: token, order_id: orderId });
  }

  private async inquiryByMerchantOrderId(
    base: string,
    token: string,
    merchantOrderId: string,
  ): Promise<any> {
    return this.postInquiry(base, {
      auth_token: token,
      merchant_order_id: merchantOrderId,
    });
  }

  private async postInquiry(base: string, body: Record<string, string>): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${base}/api/ecommerce/orders/transaction_inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderTimeoutError('paymob transaction inquiry');
    }
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
    const attempt = await findAttemptForProvider(
      this.attempts,
      providerReference,
      this.providerCode,
    );
    if (!attempt) return null;
    const creds = await this.credentialsService.load(attempt.providerAccount.id).catch(() => null);
    if (!creds?.hmac_secret) return null;

    if (!this.validHmac(tx, creds.hmac_secret, hmac)) return null;

    const orderStillOpen = this.orderStillOpen(tx);
    let result = this.txResult(tx);
    if (result === PROVIDER_RESULT.FAILED && orderStillOpen) return null;

    // Trust anchor: re-query the order to confirm the latest transaction state
    try {
      const ctx = await this.context(providerReference);
      const base = String(ctx.config.base_url || 'https://accept.paymob.com').replace(/\/$/, '');
      const authToken = await this.authToken(base, ctx.credentials.api_key);
      const inquired = await this.inquiry(base, authToken, providerReference);
      if (inquired) {
        const inquiredResult = this.txResult(inquired);
        if (
          inquiredResult !== PROVIDER_RESULT.UNKNOWN &&
          !(inquiredResult === PROVIDER_RESULT.FAILED && orderStillOpen)
        ) {
          result = inquiredResult;
        }
      }
    } catch {
      // fall through to HMAC-verified result
    }

    return { providerEventId: tx.id != null ? String(tx.id) : null, eventType: `transaction.${result}`, result, providerReference, raw: body };
  }

  private orderStillOpen(tx: any): boolean {
    return String(tx.order?.payment_status || '').toUpperCase() === 'UNPAID' && tx.order?.is_canceled !== true;
  }

  private async context(providerReference: string) {
    if (this.bound) return { config: (this.bound.account.config ?? {}) as any, credentials: this.bound.credentials };
    const attempt = await findAttemptForProvider(
      this.attempts,
      providerReference,
      this.providerCode,
    );
    if (!attempt) throw new ProviderConfigError('paymob: attempt not found or ambiguous');
    const account = attempt.providerAccount;
    const credentials = await this.credentialsService.load(account.id);
    return { config: (account.config ?? {}) as any, credentials };
  }
}

