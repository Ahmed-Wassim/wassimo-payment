import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APP_CONFIG } from '../../../config/config.module.ts';
import type { AppConfig } from '../../../config/configuration.ts';
import { CurrenciesService } from '../../currencies/currencies.service.ts';
import { PaymentAttempt } from '../../payments/entities/payment-attempt.entity.ts';
import { ProviderAdapter } from '../adapter.ts';
import { MockAdapter } from '../adapters/mock/mock.adapter.ts';
import { PaytabsAdapter } from '../adapters/paytabs/paytabs.adapter.ts';
import { PaymobAdapter } from '../adapters/paymob/paymob.adapter.ts';
import { ProviderAccount } from '../entities/provider-account.entity.ts';
import { PROVIDER_CODE, isProviderCode } from '../provider-code.ts';
import { ProviderCredentialService } from '../provider-credential.service.ts';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly mockAdapter: MockAdapter,
    private readonly credentials: ProviderCredentialService,
    private readonly currencies: CurrenciesService,
    @InjectRepository(PaymentAttempt)
    private readonly attempts: Repository<PaymentAttempt>,
    @InjectRepository(ProviderAccount)
    private readonly accounts: Repository<ProviderAccount>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async forAccount(account: ProviderAccount): Promise<ProviderAdapter> {
    const code = account.providerCode;
    if (!isProviderCode(code)) {
      throw new ServiceUnavailableException(`unknown provider ${code}`);
    }

    if (code === PROVIDER_CODE.Mock) {
      if (this.config.app.env === 'prod') {
        throw new ServiceUnavailableException(
          'mock provider is not available in production',
        );
      }
      return this.mockAdapter;
    }

    const decrypted = await this.credentials.load(account.id);
    const bound = { account, credentials: decrypted };

    switch (code) {
      case PROVIDER_CODE.Paytabs:
        return new PaytabsAdapter(
          this.currencies,
          this.credentials,
          this.attempts,
          this.accounts,
          bound,
        );
      case PROVIDER_CODE.Paymob:
        return new PaymobAdapter(
          this.credentials,
          this.attempts,
          this.accounts,
          bound,
        );
      case PROVIDER_CODE.Payfort:
      case PROVIDER_CODE.Fawaterak:
        throw new ServiceUnavailableException(
          `no adapter configured for provider ${code}`,
        );
    }
  }

  async forProviderCode(providerCode: string): Promise<ProviderAdapter> {
    if (!isProviderCode(providerCode)) {
      throw new ServiceUnavailableException(`unknown provider ${providerCode}`);
    }
    switch (providerCode) {
      case PROVIDER_CODE.Mock:
        if (this.config.app.env === 'prod') {
          throw new ServiceUnavailableException(
            'mock provider is not available in production',
          );
        }
        return this.mockAdapter;
      case PROVIDER_CODE.Paytabs:
        return new PaytabsAdapter(
          this.currencies,
          this.credentials,
          this.attempts,
          this.accounts,
          null,
        );
      case PROVIDER_CODE.Paymob:
        return new PaymobAdapter(
          this.credentials,
          this.attempts,
          this.accounts,
          null,
        );
      case PROVIDER_CODE.Payfort:
      case PROVIDER_CODE.Fawaterak:
        throw new ServiceUnavailableException(
          `no adapter configured for provider ${providerCode}`,
        );
    }
  }
}
