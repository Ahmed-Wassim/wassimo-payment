import Joi from 'joi';

export interface EnvVars {
  ENV: 'dev' | 'prod';
  PORT: number;
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  OUTBOX_POLL_SECONDS: number;
  EXPIRY_SWEEP_SECONDS: number;
  PAYMENT_TTL_SECONDS: number;
  JWT_SECRET: string;
  ENCRYPTION_KEY?: string;
  MOCK_WEBHOOK_SECRET: string;
  APP_URL: string;
}

export const envValidationSchema = Joi.object<EnvVars, true>({
  ENV: Joi.string().valid('dev', 'prod').default('dev'),
  PORT: Joi.number().integer().min(1).default(8080),
  DATABASE_URL: Joi.string().min(1).required(),
  RABBITMQ_URL: Joi.string().default(
    'amqp://wassimo:wassimo-dev-password@localhost:5672',
  ),
  OUTBOX_POLL_SECONDS: Joi.number().integer().min(1).default(5),
  EXPIRY_SWEEP_SECONDS: Joi.number().integer().min(1).default(60),
  PAYMENT_TTL_SECONDS: Joi.number().integer().min(1).default(1800),
  JWT_SECRET: Joi.string().default('dev-jwt-secret-change-in-prod'),
  ENCRYPTION_KEY: Joi.string().hex().length(64).optional(),
  MOCK_WEBHOOK_SECRET: Joi.string().min(1).default('mock-dev-secret'),
  APP_URL: Joi.string().uri().default('http://localhost:9053'),
}).unknown(true);

export function validateEnv(env: NodeJS.ProcessEnv): EnvVars {
  const { error, value } = envValidationSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });
  if (error) {
    throw new Error(`Configuration error: ${error.message}`);
  }
  return value as EnvVars;
}
