import { registerAs } from '@nestjs/config';

export default registerAs('resend', () => ({
  key: process.env.RESEND_API_KEY,
}));
