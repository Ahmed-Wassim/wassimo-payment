import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.ts';
import { PermissionsSeeder } from '../permissions/permissions.seeder.ts';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(PermissionsSeeder);
  await seeder.seed();
  await app.close();
}

bootstrap();