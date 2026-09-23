import { registerAs } from '@nestjs/config';

export default registerAs('inngest', () => ({
  secret: process.env.INNGEST_SECRET,
  signingKey: process.env.INNGEST_SIGNING_KEY,
}));
