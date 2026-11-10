import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.ts';
import { SEEDERS } from './seeders/index.ts';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('Seeding database...\n');

  for (const Seeder of SEEDERS) {
    const seeder = app.get(Seeder);
    await seeder.seed();
  }

  console.log('\nAll seeders completed successfully');
  await app.close();
}

bootstrap();