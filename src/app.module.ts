import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health/health.controller.ts';
import { APP_CONFIG, AppConfigModule } from './config/config.module.ts';
import type { AppConfig } from './config/configuration.ts';
import { OrganizationsModule } from './organizations/organizations.module.ts';

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
        entities: [import.meta.dirname + '/**/*.entity.js'],
      }),
    }),
    OrganizationsModule,
  ],
  controllers: [HealthController],
})

export class AppModule {}