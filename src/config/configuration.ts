import { validateEnv } from './env.validation.ts';

export interface AppConfig {
  app: { port: number; env: 'dev' | 'prod' };
  db: { url: string };
  broker: { url: string };
  outbox: { pollSeconds: number };
  expiry: { sweepSeconds: number };
  jwt: { secret: string };
}

export function loadConfig(): AppConfig {
  const env = validateEnv(process.env);
  return {
    app: { port: env.PORT, env: env.ENV },
    db: { url: env.DATABASE_URL },
    broker: { url: env.RABBITMQ_URL },
    outbox: { pollSeconds: env.OUTBOX_POLL_SECONDS },
    expiry: { sweepSeconds: env.EXPIRY_SWEEP_SECONDS },
    jwt: { secret: env.JWT_SECRET },
  };
}
