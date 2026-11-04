import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG } from './config/config.module.ts';
import { AppConfig } from './config/configuration.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get<AppConfig>(APP_CONFIG);
  await app.listen(cfg.app.port);
}
await bootstrap();
