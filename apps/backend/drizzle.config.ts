import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/common/database/schema/**/*.ts',
  out: './src/common/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});