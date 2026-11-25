import { validateEnv } from './env.validation.ts';

export const ENTITY_GLOB = 'dist/**/*.entity.js';

export interface AppConfig {
  app: { port: number; env: 'dev' | 'prod'; url: string };
  observability: { otlpEndpoint: string | null };
  db: { url: string };
  broker: { url: string };
  outbox: { pollSeconds: number };
  expiry: { ttlSeconds: number; sweepSeconds: number };
  jwt: { secret: string };
  encryption: { key: string | null };
  mock: { webhookSecret: string };
}

export function loadConfig(): AppConfig {
  const env = validateEnv(process.env);
  return {
    app: { port: env.PORT, env: env.ENV, url: env.APP_URL },
    observability: {
      otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT || null,
    },
    db: { url: env.DATABASE_URL },
    broker: { url: env.RABBITMQ_URL },
    outbox: { pollSeconds: env.OUTBOX_POLL_SECONDS },
    expiry: { ttlSeconds: env.PAYMENT_TTL_SECONDS, sweepSeconds: env.EXPIRY_SWEEP_SECONDS },
    jwt: { secret: env.JWT_SECRET },
    encryption: { key: env.ENCRYPTION_KEY ?? null },
    mock: { webhookSecret: env.MOCK_WEBHOOK_SECRET },
  };
}
