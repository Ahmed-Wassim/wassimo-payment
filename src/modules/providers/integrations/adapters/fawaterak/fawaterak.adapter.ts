import { createHmac, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { CurrenciesService } from '../../../../currencies/currencies.service.ts';
import { PaymentAttempt } from '../../../../payments/entities/payment-attempt.entity.ts';
import { ProviderAccount } from '../../../accounts/entity/provider-account.entity.ts';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderEvent,
  ProviderConfigError,
  ProviderOutcomeUnknownError,
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

export class FawaterakAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Fawaterak;

  constructor(
    private readonly currencies: CurrenciesService,
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
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

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/v3/createTransaction`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderTimeoutError('fawaterak createTransaction request');
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ProviderTimeoutError('fawaterak createTransaction response');
    }
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
    const { config, credentials } = await this.context(providerReference);
    const tx = await this.getTransaction(providerReference, config, credentials);
    const paid = tx?.paid;
    if (paid === 1 || paid === '1' || paid === true) {
      return { result: PROVIDER_RESULT.SUCCEEDED };
    }
    const status = String(tx?.status_text || '').toLowerCase();
    if (['failed', 'fail', 'expired', 'canceled', 'cancelled'].includes(status)) {
      return { result: PROVIDER_RESULT.FAILED };
    }
    return { result: PROVIDER_RESULT.UNKNOWN };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.bound) throw new ProviderConfigError('fawaterak: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const creds = this.bound.credentials;
    const baseUrl = this.baseUrl(config);
    const token = await this.accessToken(baseUrl, creds);

    if (!input.reason?.trim()) {
      throw new ProviderConfigError('fawaterak refund requires a reason');
    }

    const transaction = await this.getTransaction(
      input.providerReference,
      config,
      creds,
      token,
    );
    const transactionId = Number(transaction?.transaction_id);
    if (!Number.isSafeInteger(transactionId) || transactionId <= 0) {
      throw new ProviderConfigError('fawaterak: missing transaction_id for refund');
    }

    const currency = await this.currencies.requireEnabled(input.currency);
    const amount = Number(this.currencies.minorToDecimal(input.amountMinor, currency.exponent));

    let res: Response;
    let data: any;
    try {
      res = await fetch(`${baseUrl}/api/v3/refund/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_type: '3',
          refund_id: transactionId,
          reason: input.reason.trim(),
          refundable_amount: amount,
        }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
      data = await res.json();
    } catch {
      throw new ProviderTimeoutError('fawaterak refund request');
    }
    if (res.status >= 500) {
      throw new ProviderOutcomeUnknownError(
        `fawaterak refund returned HTTP ${res.status}`,
      );
    }
    if (!res.ok) {
      throw new ProviderConfigError(`fawaterak refund: ${res.status} ${data?.message || ''}`);
    }
    return {
      providerRef: null,
      result: PROVIDER_RESULT.UNKNOWN,
    };
  }

  private async getTransaction(
    intentKey: string,
    config: any,
    credentials: Record<string, string>,
    accessToken?: string,
  ) {
    const baseUrl = this.baseUrl(config);
    const token = accessToken ?? (await this.accessToken(baseUrl, credentials));
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/v3/getTransactionData`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent_key: intentKey }),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderTimeoutError('fawaterak transaction inquiry');
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new ProviderTimeoutError('fawaterak refund response');
    }
    return data?.data || data;
  }

  private async context(providerReference: string) {
    if (this.bound) {
      return { config: (this.bound.account.config ?? {}) as any, credentials: this.bound.credentials };
    }
    const attempt = await findAttemptForProvider(
      this.attempts,
      providerReference,
      this.providerCode,
    );
    if (!attempt) throw new ProviderConfigError('fawaterak: attempt not found');
    const account = attempt.providerAccount;
    const credentials = await this.credentialsService.load(account.id);
    return { config: (account.config ?? {}) as any, credentials };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
    _query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    const body = this.parseBody(headers, rawBody);
    if (!body) return null;

    const transactionKey = body.transaction_key || body.transactionKey || body.intent_key;
    const transactionId = body.transaction_id ?? body.transactionId;
    const status = String(body.status || body.invoice_status || '').toLowerCase();
    const paymentMethod = body.payment_method || body.paymentMethod || '';
    if (!transactionKey) return null;

    const providerReference = String(transactionKey);
    const attempt = await findAttemptForProvider(
      this.attempts,
      providerReference,
      this.providerCode,
    );
    if (!attempt) return null;

    const creds = await this.credentialsService.load(attempt.providerAccount.id).catch(() => null);
    const vendorKey = creds?.vendor_api_key || creds?.api_key;
    if (!vendorKey) return null;

    const receivedHash = body.transactionHashKey || body.hashKey || body.hash_key;
    if (!receivedHash) return null;
    const signed = `TransactionId=${transactionId ?? ''}&TransactionKey=${transactionKey}&PaymentMethod=${paymentMethod}`;
    const expected = createHmac('sha256', vendorKey).update(signed).digest('hex');
    if (!this.safeEqual(expected, String(receivedHash))) return null;

    const account = attempt.providerAccount;
    const tx = await this.getTransaction(providerReference, account.config as any, creds as any).catch(() => null);
    if (!tx) return null;
    const result = this.outcomeFromTransaction(tx, status);
    if (result === PROVIDER_RESULT.UNKNOWN) return null;

    return {
      providerEventId: transactionId != null ? String(transactionId) : null,
      eventType: `transaction.${result}`,
      result,
      providerReference,
      raw: body,
    };
  }

  private outcomeFromTransaction(tx: any, fallbackStatus: string): ProviderResult {
    const paid = tx?.paid;
    if (paid === 1 || paid === '1' || paid === true) {
      return PROVIDER_RESULT.SUCCEEDED;
    }
    const status = String(tx?.status_text || tx?.status || fallbackStatus || '').toLowerCase();
    if (['paid', 'success', 'succeeded'].includes(status)) {
      return PROVIDER_RESULT.SUCCEEDED;
    }
    if (['failed', 'fail', 'expired', 'canceled', 'cancelled'].includes(status)) {
      return PROVIDER_RESULT.FAILED;
    }
    if (status === 'pending') return PROVIDER_RESULT.PENDING;
    return PROVIDER_RESULT.UNKNOWN;
  }

  private parseBody(headers: Record<string, string>, rawBody: Buffer): any | null {
    const contentType = headers['content-type'] || '';
    try {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        return Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));
      }
      return JSON.parse(rawBody.toString('utf8'));
    } catch {
      return null;
    }
  }

  private safeEqual(expected: string, received: string): boolean {
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    } catch {
      return false;
    }
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
      signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !data?.access_token) {
      throw new ProviderConfigError('fawaterak: failed to obtain access token');
    }
    return data.access_token;
  }
}
