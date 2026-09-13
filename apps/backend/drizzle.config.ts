export default {
  schema: './src/common/database/schema/**/*.ts',
  out: './src/common/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};