import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { loadConfig } from '../config/configuration.js';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: loadConfig().db.url,
  synchronize: false,
  logging: ['error'],
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/db/migrations/*.ts'],
});
