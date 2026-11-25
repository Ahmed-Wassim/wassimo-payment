import { Repository } from 'typeorm';
import { CurrenciesService } from '../../../../currencies/currencies.service.ts';
import { PaymentAttempt } from '../../../../payments/entities/payment-attempt.entity.ts';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderConfigError,
  ProviderEvent,
  PROVIDER_RESULT,
  ProviderTimeoutError,
  PROVIDER_REQUEST_TIMEOUT_MS,
  RefundInput,
  RefundResult,
} from '../../adapter.ts';
import { ProviderAccount } from '../../../accounts/entity/provider-account.entity.ts';
import { PROVIDER_CODE } from '../../../provider-code.ts';
import { ProviderCredentialService } from '../../../credentials/provider-credential.service.ts';
import { findAttemptForProvider } from '../../provider-attempt.lookup.ts';
import { PROVIDER_STATUS } from '../../provider-status.ts';

export class PaytabsAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paytabs;

  constructor(
    private readonly currencies: CurrenciesService,
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly bound: { account: ProviderAccount; credentials: Record<string, string> } | null,
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const creds = this.bound.credentials;
    const currency = await this.currencies.requireEnabled(input.currency);
    const amount = this.currencies.minorToDecimal(input.amountMinor, currency.exponent);
    const baseUrl = String(config.base_url || 'https://secure-egypt.paytabs.com').replace(/\/$/, '');

    const body: any = {
      profile_id: config.profile_id,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: input.paymentId,
      cart_currency: input.currency.toUpperCase(),
      cart_amount: amount,
      cart_description: `payment ${input.paymentId}`,
      payment_methods: [input.method],
      callback: config.callback_url,
      return: config.return_url,
    };
    if (input.customerDetails) {
      body.customer_details = this.customerDetails(input.customerDetails);
    }

    const data = await this.post(baseUrl, '/payment/request', creds.server_key, body);
    return { providerReference: data.tran_ref ?? null, redirectUrl: data.redirect_url };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    return this.queryWith(this.bound.account.config as any, this.bound.credentials, providerReference);
  }

  async queryStatusByPaymentId(paymentId: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    const config = this.bound.account.config as any;
    const baseUrl = String(config?.base_url || 'https://secure-egypt.paytabs.com').replace(/\/$/, '');
    const transactions = await this.post(baseUrl, '/payment/query', this.bound.credentials.server_key, {
      profile_id: config.profile_id,
      cart_id: paymentId,
    });

    if (!Array.isArray(transactions) || transactions.length !== 1) {
      return { result: PROVIDER_RESULT.UNKNOWN };
    }
    return this.outcomeFromQuery(transactions[0]);
  }

  async queryRefundStatus(refundReference: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    const config = this.bound.account.config as any;
    const baseUrl = String(config?.base_url || 'https://secure-egypt.paytabs.com').replace(/\/$/, '');
    const data = await this.post(baseUrl, '/payment/query', this.bound.credentials.server_key, {
      profile_id: config.profile_id,
      tran_ref: refundReference,
    });
    if (String(data?.tran_type || '').toLowerCase() !== 'refund') {
      return { result: PROVIDER_RESULT.UNKNOWN };
    }
    return this.outcomeFromQuery(data);
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    const config = (this.bound.account.config ?? {}) as any;
    const creds = this.bound.credentials;
    const currency = await this.currencies.requireEnabled(input.currency);
    const amount = this.currencies.minorToDecimal(input.amountMinor, currency.exponent);
    const baseUrl = String(config.base_url || 'https://secure-egypt.paytabs.com').replace(/\/$/, '');
    const data = await this.post(baseUrl, '/payment/refund', creds.server_key, {
      profile_id: config.profile_id,
      tran_type: 'refund',
      tran_class: 'ecom',
      cart_id: input.paymentId,
      cart_currency: input.currency.toUpperCase(),
      cart_amount: amount,
      tran_ref: input.providerReference,
    });
    const refundRef = data.tran_ref || data.refund_ref;
    const outcome = this.outcomeFromQuery(data);
    return {
      providerRef: refundRef ? String(refundRef) : null,
      result: outcome.result,
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
    _query: Record<string, string | string[] | undefined>,
  ): Promise<ProviderEvent | null> {
    const parsed = this.parseWebhookBody(headers, rawBody);
    if (!parsed) return null;

    const tranRef = parsed.tran_ref || parsed.tranRef;
    if (!tranRef) return null;

    const attempt = await findAttemptForProvider(
      this.attempts,
      String(tranRef),
      this.providerCode,
    );
    if (!attempt) return null;
    const account = attempt.providerAccount;
    const credentials = await this.credentialsService.load(account.id).catch(() => null);
    if (!credentials) return null;

    const outcome = await this.queryWith(account.config as any, credentials, String(tranRef)).catch(() => ({ result: PROVIDER_RESULT.UNKNOWN }));
    if (outcome.result === PROVIDER_RESULT.UNKNOWN) return null;

    return {
      providerEventId: null,
      eventType: `charge.${outcome.result}`,
      result: outcome.result,
      providerReference: String(tranRef),
      raw: parsed,
      failureReason: outcome.failureReason,
    };
  }

  private async queryWith(config: any, credentials: Record<string, string>, providerReference: string): Promise<Outcome> {
    const baseUrl = String(config?.base_url || 'https://secure-egypt.paytabs.com').replace(/\/$/, '');
    const data = await this.post(baseUrl, '/payment/query', credentials.server_key, {
      profile_id: config.profile_id,
      tran_ref: providerReference,
    });
    return this.outcomeFromQuery(data);
  }

  private outcomeFromQuery(data: any): Outcome {
    const status = data.payment_result?.response_status || data.response_status;
    if (status === PROVIDER_STATUS.PAYTABS.APPROVED) {
      return { result: PROVIDER_RESULT.SUCCEEDED };
    }
    switch (status) {
      case PROVIDER_STATUS.PAYTABS.DECLINED:
        return { result: PROVIDER_RESULT.FAILED, failureReason: 'declined' };
      case PROVIDER_STATUS.PAYTABS.CANCELED:
        return {
          result: PROVIDER_RESULT.FAILED,
          failureReason: 'customer_cancelled',
        };
      case PROVIDER_STATUS.PAYTABS.EXPIRED:
        return { result: PROVIDER_RESULT.FAILED, failureReason: 'expired' };
      case PROVIDER_STATUS.PAYTABS.VOIDED:
        return { result: PROVIDER_RESULT.FAILED, failureReason: 'voided' };
      case PROVIDER_STATUS.PAYTABS.ERROR:
        return { result: PROVIDER_RESULT.FAILED, failureReason: 'provider_error' };
      default:
        return { result: PROVIDER_RESULT.UNKNOWN };
    }
  }

  private customerDetails(c: any) {
    return {
      name: c.name,
      email: c.email,
      phone: c.phone,
      street1: c.street,
      city: c.city,
      state: c.state,
      country: c.country?.toUpperCase(),
      zip: c.zip,
    };
  }

  private parseWebhookBody(headers: Record<string, string>, rawBody: Buffer): any | null {
    const contentType = headers['content-type'] || '';
    try {
      return contentType.includes('application/x-www-form-urlencoded')
        ? Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')))
        : JSON.parse(rawBody.toString('utf8'));
    } catch {
      return null;
    }
  }

  private async post(baseUrl: string, path: string, serverKey: string, body: any): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: serverKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(PROVIDER_REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      throw new ProviderTimeoutError(`paytabs ${path}`);
    }
    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new ProviderTimeoutError(`paytabs ${path} response`);
    }
    if (!response.ok) throw new ProviderConfigError(`paytabs ${path}: ${response.status}`);
    return payload;
  }
}

