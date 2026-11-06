import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller.ts';
import { APP_CONFIG, AppConfigModule } from './config/config.module.ts';
import type { AppConfig } from './config/configuration.ts';
import { OrganizationsModule } from './organizations/organizations.module.ts';
import { CurrenciesModule } from './currencies/currencies.module.ts';
import { ApplicationsModule } from './applications/applications.module.js';

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
  ],
  controllers: [HealthController],
})
export class AppModule {}
