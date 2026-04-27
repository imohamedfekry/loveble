import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/common/database/schema/**/*.ts',
  out: './src/common/database/postgres/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});