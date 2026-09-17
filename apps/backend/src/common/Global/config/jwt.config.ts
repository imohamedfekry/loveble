// JWT configuration
import { registerAs } from '@nestjs/config';
import { randomBytes } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

// In production, JWT secrets must be provided via env; silently falling back to
// a guessable constant is a security hole. In dev, a random per-boot secret
// keeps session signing sane without committing secrets.
function resolveSecret(envValue: string | undefined, name: string): string {
  if (envValue) return envValue;
  if (isProduction) {
    throw new Error(`Missing required env var ${name} in production`);
  }
  return randomBytes(48).toString('hex');
}

export default registerAs('jwt', () => ({
  accessToken: {
    secret: resolveSecret(
      process.env.JWT_SECRET_ACCESS || process.env.JWT_ACCESS,
      'JWT_SECRET_ACCESS',
    ),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  refreshToken: {
    secret: resolveSecret(
      process.env.JWT_SECRET_REFRESH || process.env.JWT_REFRESH,
      'JWT_SECRET_REFRESH',
    ),
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  temp: {
    secret: resolveSecret(process.env.JWT_TEMP, 'JWT_TEMP'),
  },
  oauth: {
    secret: resolveSecret(process.env.OAUTH_TOKEN, 'OAUTH_TOKEN'),
    expiresIn: '2m',
  },
}));
