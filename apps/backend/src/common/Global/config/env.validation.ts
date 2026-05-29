import { validate } from 'src/common/utils/validate';
import * as v from 'valibot';

const envSchema = v.object({
  // ENV
  NODE_ENV: v.optional(
    v.pipe(
      v.string(),
      v.nonEmpty(),
      v.picklist(['development', 'production', 'test']),
    ),
    'development',
  ),

  DATABASE_URL: v.pipe(v.string(), v.nonEmpty()),

  PORT: v.pipe(
    v.string(),
    v.transform((val) => Number(val)),
    v.number(),
    v.minValue(1),
    v.maxValue(65535),
  ),
  CORS_ORIGIN: v.pipe(v.string(), v.nonEmpty()),
  MONGODB_URL: v.pipe(v.string(), v.nonEmpty()),
  LOG_LEVEL: v.optional(
    v.pipe(
      v.string(),
      v.nonEmpty(),
      v.picklist(['error', 'warn', 'log', 'debug', 'verbose']),
    ),
    'log',
  ),
  // JWT
  JWT_SECRET_ACCESS: v.pipe(v.string(), v.nonEmpty()),
  JWT_TEMP: v.pipe(v.string(), v.nonEmpty()),
  JWT_EXPIRES_IN: v.pipe(v.string(), v.nonEmpty()),
  JWT_SECRET_REFRESH: v.pipe(v.string(), v.nonEmpty()),
  JWT_REFRESH_EXPIRES_IN: v.pipe(v.string(), v.nonEmpty()),
  OAUTH_TOKEN: v.pipe(v.string(), v.nonEmpty()),
  // Encryption
  ENCRYPTION_KEY: v.pipe(v.string(), v.nonEmpty()),
  ENCRYPTION_ALGORITHM: v.pipe(v.string(), v.nonEmpty()),
  ENCRYPTION_IV: v.pipe(v.string(), v.nonEmpty()),

  // GitHub
  GITHUB_CLIENT_ID: v.optional(v.string()),
  GITHUB_CLIENT_SECRET: v.optional(v.string()),
  GITHUB_CALLBACK_URL: v.optional(v.string()),

  // Redis
  REDIS_URL: v.optional(v.string()),
  REDIS_HOST: v.optional(v.string(), '127.0.0.1'),
  REDIS_PORT: v.optional(
    v.pipe(v.string(), v.nonEmpty()),
    '6379',
  ),
  REDIS_USERNAME: v.optional(v.string(), ''),
  REDIS_PASSWORD: v.optional(v.string(), ''),
  REDIS_DB: v.optional(
    v.pipe(v.string(), v.nonEmpty()),
    '0',
  ),
  SENTRY_DSN: v.optional(v.string()),
});

export type Env = v.InferOutput<typeof envSchema>;

export function env(config: Record<string, unknown>): Env {
  return validate(envSchema, config, {
    title: 'ENV VALIDATION FAILED',
    exitOnError: true,
  });
}