import { registerAs } from '@nestjs/config';

export default registerAs('inngest', () => ({
  secret: process.env.INNGEST_SECRET,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
}));