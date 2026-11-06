import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { loadConfig } from '../config/configuration.ts';
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: loadConfig().db.url,
  synchronize: false,
  logging: ['error'],
  entities: ['dist/**/*.entity.js'],
  uuidExtension: 'pgcrypto',
  migrations: ['src/db/migrations/*.ts'],
});
