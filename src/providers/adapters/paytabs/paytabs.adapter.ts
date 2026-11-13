import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrenciesService } from '../../../currencies/currencies.service.ts';
import { PaymentAttempt } from '../../../payments/entities/payment-attempt.entity.ts';
import {
  AdapterCapabilities,
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

type PaytabsBound = {
  account: ProviderAccount;
  credentials: Record<string, string>;
};

export class PaytabsAdapter implements ProviderAdapter {
  readonly providerCode = PROVIDER_CODE.Paytabs;

  constructor(
    private readonly currencies: CurrenciesService,
    private readonly credentialsService: ProviderCredentialService,
    private readonly attempts: Repository<PaymentAttempt>,
    private readonly accounts: Repository<ProviderAccount>,
    private readonly bound: PaytabsBound | null,
  ) {}

  capabilities(): AdapterCapabilities {
    return { methods: ['creditcard'], operations: ['charge'], environments: ['test'] };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const { config, credentials } = this.requireBound();
    const currency = await this.currencies.requireEnabled(input.currency);
    const baseUrl = this.baseUrl(config);
    const profileId = this.stringConfig(config, 'profile_id');
    const serverKey = this.requireCredential(credentials, 'server_key');

    const amount = this.currencies.minorToDecimal(input.amountMinor, currency.exponent);
    const callbackUrl = this.callbackUrl(config);
    const returnUrl = this.returnUrl(config);

    const body = {
      profile_id: profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: input.paymentId,
      cart_currency: input.currency.toUpperCase(),
      cart_amount: amount,
      cart_description: `payment ${input.paymentId}`,
      payment_methods: [input.method],
      callback: callbackUrl,
      return: returnUrl,
    };

    const data = await this.post(baseUrl, '/payment/request', serverKey, body, config);
    const redirectUrl = typeof data.redirect_url === 'string' ? data.redirect_url : null;
    if (!redirectUrl) {
      throw new ProviderConfigError('paytabs createCheckout: missing redirect_url');
    }
    const tranRef =
      typeof data.tran_ref === 'string' ? data.tran_ref : null;
    return { providerReference: tranRef, redirectUrl };
  }

  async queryStatus(providerReference: string): Promise<Outcome> {
    const { config, credentials } = this.requireBound();
    return this.queryStatusWith(config, credentials, providerReference);
  }

  async verifyWebhook(
    headers: Record<string, string>,
    rawBody: Buffer,
  ): Promise<ProviderEvent | null> {
    let parsed: Record<string, unknown>;
    const contentType = headers['content-type'] ?? '';
    try {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        parsed = Object.fromEntries(
          new URLSearchParams(rawBody.toString('utf8')),
        ) as Record<string, unknown>;
      } else {
        parsed = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    const tranRef =
      typeof parsed.tran_ref === 'string'
        ? parsed.tran_ref
        : typeof parsed.tranRef === 'string'
          ? parsed.tranRef
          : null;
    if (!tranRef) {
      return null;
    }

    const attempt = await this.attempts.findOne({
      where: { providerReference: tranRef },
    });
    if (!attempt) {
      return null;
    }

    const account = await this.accounts.findOne({
      where: { id: attempt.providerAccountId },
    });
    if (!account) {
      return null;
    }

    let credentials: Record<string, string>;
    try {
      credentials = await this.credentialsService.load(account.id);
    } catch {
      return null;
    }

    let outcome: Outcome;
    try {
      outcome = await this.queryStatusWith(account.config ?? {}, credentials, tranRef);
    } catch {
      return null;
    }

    if (outcome.result === 'unknown') {
      return null;
    }

    return {
      providerEventId: null,
      eventType: `charge.${outcome.result}`,
      result: outcome.result,
      providerReference: tranRef,
      raw: parsed,
    };
  }

  private async queryStatusWith(
    config: Record<string, unknown>,
    credentials: Record<string, string>,
    providerReference: string,
  ): Promise<Outcome> {
    const baseUrl = this.baseUrl(config);
    const profileId = this.stringConfig(config, 'profile_id');
    const serverKey = this.requireCredential(credentials, 'server_key');

    const data = await this.post(
      baseUrl,
      '/payment/query',
      serverKey,
      { profile_id: profileId, tran_ref: providerReference },
      config,
    );

    const status = this.extractResponseStatus(data);
    if (status === 'A') return { result: 'succeeded' };
    if (status === 'D' || status === 'C') return { result: 'failed' };
    return { result: 'unknown' };
  }

  private extractResponseStatus(data: Record<string, unknown>): string | null {
    const paymentResult = data.payment_result;
    if (paymentResult && typeof paymentResult === 'object') {
      const status = (paymentResult as Record<string, unknown>).response_status;
      if (typeof status === 'string') return status;
    }
    const direct = data.response_status;
    if (typeof direct === 'string') return direct;
    return null;
  }

  private async post(
    baseUrl: string,
    path: string,
    serverKey: string,
    body: Record<string, unknown>,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const timeoutMs = this.timeoutMs(config);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: serverKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new ProviderTimeoutError(`paytabs ${path}: ${(e as Error).message}`);
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      payload = { raw: 'unparseable body' };
    }

    if (!response.ok || this.isConfigFault(payload)) {
      throw new ProviderConfigError(
        `paytabs ${path} -> HTTP ${response.status}: ${this.describe(payload)}`,
      );
    }

    return payload;
  }

  private isConfigFault(payload: Record<string, unknown>): boolean {
    const code = String(payload.code ?? payload.response_code ?? '');
    return /^4/.test(code) || code === '1' || code === '401' || code === '400';
  }

  private describe(payload: Record<string, unknown>): string {
    const code = payload.code ?? payload.response_code ?? '-';
    const message = payload.message ?? payload.result ?? '-';
    return `code=${String(code)} message=${String(message)}`;
  }

  private requireBound(): { config: Record<string, unknown>; credentials: Record<string, string> } {
    if (!this.bound) {
      throw new ProviderConfigError('paytabs adapter is not bound to an account');
    }
    return {
      config: (this.bound.account.config ?? {}) as Record<string, unknown>,
      credentials: this.bound.credentials,
    };
  }

  private stringConfig(config: Record<string, unknown>, key: string): string {
    const value = config[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new ProviderConfigError(`paytabs missing config: ${key}`);
    }
    return value;
  }

  private requireCredential(credentials: Record<string, string>, key: string): string {
    const value = credentials[key];
    if (!value) {
      throw new ProviderConfigError(`paytabs missing credential: ${key}`);
    }
    return value;
  }

  private baseUrl(config: Record<string, unknown>): string {
    const value = config.base_url;
    if (typeof value === 'string' && value.length > 0) {
      return value.replace(/\/$/, '');
    }
    return 'https://secure-egypt.paytabs.com';
  }

  private timeoutMs(config: Record<string, unknown>): number {
    const value = config.timeout_ms;
    if (typeof value === 'number' && value > 0) return value;
    return 8000;
  }

  private callbackUrl(config: Record<string, unknown>): string {
    const value = config.callback_url;
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ProviderConfigError('paytabs missing config: callback_url');
  }

  private returnUrl(config: Record<string, unknown>): string {
    const value = config.return_url;
    if (typeof value === 'string' && value.length > 0) return value;
    throw new ProviderConfigError('paytabs missing config: return_url');
  }
}
