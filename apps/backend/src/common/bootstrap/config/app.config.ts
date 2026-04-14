import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: 'api',
  apiVersion: 'v1',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  swagger: {
    title: 'Discord Clone API',
    description: 'Discord Clone Backend API Documentation',
    version: '1.0',
    path: 'api/docs',
  },
}));
