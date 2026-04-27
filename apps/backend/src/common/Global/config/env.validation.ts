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
});

export type Env = v.InferOutput<typeof envSchema>;

// ✅ دي function مش object
export function validateEnv(env: Record<string, unknown>): Env {
  const result = v.safeParse(envSchema, env);

  if (!result.success) {
    const errors = v.flatten(result.issues).nested ?? {};

    const R = '\x1b[38;5;203m'; // red
    const RD = '\x1b[38;5;167m'; // red dim
    const G = '\x1b[38;5;114m'; // green
    const W = '\x1b[38;5;250m'; // white muted
    const D = '\x1b[2m'; // dim
    const B = '\x1b[1m'; // bold
    const RS = '\x1b[0m'; // reset

    const divider = `${D}${'─'.repeat(50)}${RS}`;

    const entries = Object.entries(errors)
      .map(([key, msgs]) =>
        [
          `  ${R}▸${RS} ${B}${key}${RS}`,
          ...(msgs ?? []).map((m) => `    ${D}└─${RS} ${RD}${m}${RS}`),
        ].join('\n'),
      )
      .join('\n\n');

    const output = [
      '',
      `  ${R}${B}✖  ENVIRONMENT VALIDATION FAILED${RS}`,
      `  ${divider}`,
      '',
      `  ${D}Missing or invalid variables:${RS}`,
      '',
      entries,
      '',
      `  ${divider}`,
      `  ${G}→${RS}  ${W}Add the missing variables to your ${G}.env${RS}${W} file and restart.${RS}`,
      '',
    ].join('\n');

    process.stderr.write(output + '\n');
    process.exit(1);
  }

  return result.output;
}
