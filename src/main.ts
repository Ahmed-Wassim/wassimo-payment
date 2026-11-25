import './instrumentation.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG } from './config/config.module.ts';
import { AppConfig } from './config/configuration.ts';
import { ValidationPipe } from '@nestjs/common';
import { ApiErrorFilter } from './common/errors/api-error.filter.ts';
import { OpenTelemetryNestLogger } from './observability/open-telemetry-nest.logger.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useLogger(new OpenTelemetryNestLogger());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiErrorFilter());

  const cfg = app.get<AppConfig>(APP_CONFIG);
  await app.listen(cfg.app.port);
}
await bootstrap();
