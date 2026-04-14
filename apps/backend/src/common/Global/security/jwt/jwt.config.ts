// JWT configuration
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessToken: {
    secret:
      process.env.JWT_SECRET_ACCESS ||
      process.env.JWT_ACCESS ||
      'your-super-secret-jwt-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  refreshToken: {
    secret:
      process.env.JWT_SECRET_REFRESH ||
      process.env.JWT_REFRESH ||
      'your-super-secret-refresh-key-here',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
}));
