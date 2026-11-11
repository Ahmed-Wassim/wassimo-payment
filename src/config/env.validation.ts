import Joi from 'joi';

export interface EnvVars {
  ENV: 'dev' | 'prod';
  PORT: number;
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  OUTBOX_POLL_SECONDS: number;
  EXPIRY_SWEEP_SECONDS: number;
  JWT_SECRET: string;
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
  JWT_SECRET: Joi.string().default('dev-jwt-secret-change-in-prod'),
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
