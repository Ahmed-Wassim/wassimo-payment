import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller.ts';
import { APP_CONFIG, AppConfigModule } from './config/config.module.ts';
import type { AppConfig } from './config/configuration.ts';
import { ENTITY_GLOB } from './config/configuration.ts';
import { OrganizationsModule } from './modules/organizations/organizations.module.ts';
import { CurrenciesModule } from './modules/currencies/currencies.module.ts';
import { ApplicationsModule } from './modules/applications/applications.module.ts';
import { CredentialsModule } from './modules/credentials/credentials.module.ts';
import { AuthModule } from './modules/auth/auth.module.ts';
import { ProvidersModule } from './modules/providers/providers.module.ts';
import { UsersModule } from './modules/users/users.module.ts';
import { OptionsModule } from './modules/options/options.module.ts';
import { PermissionsModule } from './modules/permissions/permissions.module.ts';
import { CommonModule } from './common/common.module.ts';
import { PaymentsModule } from './modules/payments/payments.module.ts';
import { IdempotencyModule } from './modules/idempotency/idempotency.module.ts';
import { WebhooksModule } from './modules/webhooks/webhooks.module.ts';
import { CustomersModule } from './modules/customers/customers.module.ts';
import { RefundsModule } from './modules/refunds/refunds.module.ts';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (cfg: AppConfig) => ({
        type: 'postgres' as const,
        url: cfg.db.url,
        synchronize: false,
        logging: ['error'],
        uuidExtension: 'pgcrypto',
        entities: [ENTITY_GLOB],
      }),
    }),
    OrganizationsModule,
    CurrenciesModule,
    ApplicationsModule,
    CredentialsModule,
    AuthModule,
    ProvidersModule,
    UsersModule,
    OptionsModule,
    PermissionsModule,
    CommonModule,
    PaymentsModule,
    IdempotencyModule,
    WebhooksModule,
    CustomersModule,
    RefundsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
