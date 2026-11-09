import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller.ts';
import { APP_CONFIG, AppConfigModule } from './config/config.module.ts';
import type { AppConfig } from './config/configuration.ts';
import { OrganizationsModule } from './organizations/organizations.module.ts';
import { CurrenciesModule } from './currencies/currencies.module.ts';
import { ApplicationsModule } from './applications/applications.module.ts';
import { CredentialsModule } from './credentials/credentials.module.ts';
import { AuthModule } from './auth/auth.module.ts';
import { ProvidersModule } from './providers/providers.module.ts';
import { UsersModule } from './users/users.module.ts';
import { OptionsModule } from './options/options.module.ts';

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
        entities: [import.meta.dirname + '/**/*.entity.js'],
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
