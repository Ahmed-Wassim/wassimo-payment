import { Repository } from 'typeorm';
import { CurrenciesService } from '../../../currencies/currencies.service.ts';
import { PaymentAttempt } from '../../../payments/entities/payment-attempt.entity.ts';
import {
  CheckoutInput,
  CheckoutResult,
  Outcome,
  ProviderAdapter,
  ProviderConfigError,
  ProviderEvent,
  ProviderTimeoutError,
} from '../../adapter.ts';
import { ProviderAccount } from '../../entities/provider-account.entity.ts';
import { PROVIDER_CODE } from '../../provider-code.ts';
import { ProviderCredentialService } from '../../provider-credential.service.ts';

export class PaytabsAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paytabs;

  constructor(
    private readonly currencies: CurrenciesService,
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
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
    const c = input.customerDetails;
    if (c) {
      body.customer_details = {
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

    const data = await this.post(baseUrl, '/payment/request', creds.server_key, body);
    return { providerReference: data.tran_ref ?? null, redirectUrl: data.redirect_url };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    if (!this.bound) throw new ProviderConfigError('paytabs: not bound');
    return this.queryWith(this.bound.account.config as any, this.bound.credentials, providerReference);
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

    const attempt = await this.attempts.findOne({ where: { providerReference: String(tranRef) } });
    if (!attempt) return null;
    const account = await this.accounts.findOne({ where: { id: attempt.providerAccountId } });
    if (!account) return null;
    const credentials = await this.credentialsService.load(account.id).catch(() => null);
    if (!credentials) return null;

    const outcome = await this.queryWith(account.config as any, credentials, String(tranRef)).catch(() => ({ result: 'unknown' as const }));
    if (outcome.result === 'unknown') return null;

    return {
      providerEventId: null,
      eventType: `charge.${outcome.result}`,
      result: outcome.result,
      providerReference: String(tranRef),
      raw: parsed,
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
    if (status === 'A') return { result: 'succeeded' };
    if (status === 'D' || status === 'C') return { result: 'failed' };
    return { result: 'unknown' };
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
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      throw new ProviderTimeoutError(`paytabs ${path}`);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new ProviderConfigError(`paytabs ${path}: ${response.status}`);
    return payload;
  }
}

