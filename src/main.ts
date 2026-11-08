import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG } from './config/config.module.ts';
import { AppConfig } from './config/configuration.ts';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const cfg = app.get<AppConfig>(APP_CONFIG);
  await app.listen(cfg.app.port);
}
await bootstrap();
