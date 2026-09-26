import { registerAs } from '@nestjs/config';

export default registerAs('e2b', () => ({
  key: process.env.E2B_API_KEY,
}));
