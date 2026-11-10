import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.ts';
import { UsersModule } from '../users/users.module.ts';
import { MockAdapter } from './adapters/mock/mock.adapter.ts';
import { MockHostedController } from './adapters/mock/mock-hosted.controller.ts';
import { MockHostedService } from './adapters/mock/mock-hosted.service.ts';
import { ProviderAccount } from './entities/provider-account.entity.ts';
import { Provider } from './entities/provider.entity.ts';
import { PaymentProviderFactory } from './payment-provider.factory.ts';
import { ProvidersController } from './providers.controller.ts';
import { ProvidersService } from './providers.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, ProviderAccount]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [ProvidersController, MockHostedController],
  providers: [
    ProvidersService,
    MockHostedService,
    MockAdapter,
    PaymentProviderFactory,
  ],
  exports: [ProvidersService, PaymentProviderFactory],
})
export class ProvidersModule {}