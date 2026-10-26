import { registerAs } from '@nestjs/config';

export default registerAs('e2b', () => ({
  key: process.env.E2B_API_KEY,
  timeoutMs: Number(process.env.E2B_SANDBOX_TIMEOUT_MS ?? 3_600_000),
  template: process.env.E2B_TEMPLATE ?? 'loveble-tanstack-start',
}));
