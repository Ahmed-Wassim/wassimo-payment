import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ENTITY_GLOB, loadConfig } from '../config/configuration.ts';
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: loadConfig().db.url,
  synchronize: false,
  logging: ['error'],
  entities: [ENTITY_GLOB],
  uuidExtension: 'pgcrypto',
  migrations: ['src/database/migrations/*.ts'],
});
