import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module.ts';
import type { AppConfig } from '../config/configuration.ts';
import { ProviderAdapter } from './adapter.ts';
import { MockAdapter } from './adapters/mock/mock.adapter.ts';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { PROVIDER_CODE, isProviderCode } from './provider-code.ts';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly mockAdapter: MockAdapter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  forAccount(account: ProviderAccount): ProviderAdapter {
    const code = account.providerCode;
    if (!isProviderCode(code)) {
      throw new ServiceUnavailableException(`unknown provider ${code}`);
    }

    switch (code) {
      case PROVIDER_CODE.Mock:
        if (this.config.app.env === 'prod') {
          throw new ServiceUnavailableException('mock provider is not available in production');
        }
        return this.mockAdapter;
      case PROVIDER_CODE.Paytabs:
      case PROVIDER_CODE.Paymob:
      case PROVIDER_CODE.Payfort:
        throw new ServiceUnavailableException(
          `no adapter configured for provider ${code}`,
        );
    }
  }
}
