import { validateEnv } from './env.validation.ts';

export interface AppConfig {
  app: { port: number; env: 'dev' | 'prod'; url: string };
  db: { url: string };
  broker: { url: string };
  outbox: { pollSeconds: number };
  expiry: { sweepSeconds: number };
  jwt: { secret: string };
  encryption: { key: string | null };
  mock: { webhookSecret: string };
}

export function loadConfig(): AppConfig {
  const env = validateEnv(process.env);
  return {
    app: { port: env.PORT, env: env.ENV, url: env.APP_URL },
    db: { url: env.DATABASE_URL },
    broker: { url: env.RABBITMQ_URL },
    outbox: { pollSeconds: env.OUTBOX_POLL_SECONDS },
    expiry: { sweepSeconds: env.EXPIRY_SWEEP_SECONDS },
    jwt: { secret: env.JWT_SECRET },
    encryption: { key: env.ENCRYPTION_KEY ?? null },
    mock: { webhookSecret: env.MOCK_WEBHOOK_SECRET },
  };
}
