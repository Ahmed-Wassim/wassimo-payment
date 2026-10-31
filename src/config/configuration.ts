export interface AppConfig {
  app: { port: number; env: 'dev' | 'prod' };
  db: { url: string };
  broker: { url: string };
  outbox: { pollSeconds: number };
  expiry: { sweepSeconds: number };
}

function fail(message: string): never {
  throw new Error(`Configuration error: ${message}`);
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    fail(`Environment variable ${name} is required`);
  }
  return value;
}

function intOption(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    fail(`Environment variable ${name} must be an integer >= ${min}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  const env = process.env.ENV ?? 'dev';
  if (env !== 'dev' && env !== 'prod') {
    fail(`ENV must be one of 'dev' or 'prod' (got '${env}')`);
  }

  return {
    app: { port: intOption('PORT', 8080, 1), env },
    db: { url: required('DATABASE_URL') },
    broker: {
      url:
        process.env.RABBITMQ_URL ??
        'amqp://wassimo:wassimo-dev-password@localhost:5672',
    },
    outbox: { pollSeconds: intOption('OUTBOX_POLL_SECONDS', 5, 1) },
    expiry: { sweepSeconds: intOption('EXPIRY_SWEEP_SECONDS', 60, 1) },
  };
}
