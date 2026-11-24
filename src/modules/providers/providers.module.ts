import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { CurrenciesModule } from '../currencies/currencies.module.ts';
import { PaymentAttempt } from '../payments/entities/payment-attempt.entity.ts';
import { UsersModule } from '../users/users.module.ts';
import { ProviderAccount } from './accounts/entity/provider-account.entity.ts';
import { ProviderAccountsController } from './accounts/provider-accounts.controller.ts';
import { ProviderAccountsService } from './accounts/provider-accounts.service.ts';
import { ProviderCredential } from './credentials/entity/provider-credential.entity.ts';
import { ProviderCredentialService } from './credentials/provider-credential.service.ts';
import { MockAdapter } from './integrations/adapters/mock/mock.adapter.ts';
import { MockHostedController } from './integrations/adapters/mock/mock-hosted.controller.ts';
import { MockHostedService } from './integrations/adapters/mock/mock-hosted.service.ts';
import { PaymentProviderFactory } from './integrations/payment-provider.factory.ts';
import { Provider } from './provider.entity.ts';
import { ProviderMethodsSeeder } from './methods/methods.seeder.ts';
import { ProvidersController } from './providers.controller.ts';
import { ProvidersService } from './providers.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Provider,
      ProviderAccount,
      ProviderCredential,
      PaymentAttempt,
    ]),
    CurrenciesModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [
    ProvidersController,
    ProviderAccountsController,
    MockHostedController,
  ],
  providers: [
    ProvidersService,
    ProviderAccountsService,
    ProviderCredentialService,
    ProviderMethodsSeeder,
    MockHostedService,
    MockAdapter,
    PaymentProviderFactory,
  ],
  exports: [
    ProvidersService,
    ProviderAccountsService,
    ProviderCredentialService,
    PaymentProviderFactory,
  ],
})
export class ProvidersModule {}
