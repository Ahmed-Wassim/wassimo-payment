import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.ts';
import { SEEDERS } from './seeders/index.ts';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('🌱 Starting database seeding...\n');

  for (const Seeder of SEEDERS) {
    const seeder = app.get(Seeder);
    await seeder.seed();
  }

  console.log('\n✅ All seeders completed successfully');
  await app.close();
}

bootstrap();