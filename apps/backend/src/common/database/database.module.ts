import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DatabaseService } from './database.service';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');
export type DrizzleDatabase = NodePgDatabase<typeof schema>;

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const drizzleProvider = {
      provide: DRIZZLE_DB,
      useFactory: async (config: ConfigService) => {
        const dbUrl = new URL(config.get<string>('DATABASE_URL')!);

        const pool = new Pool({
          host: dbUrl.hostname,
          port: Number(dbUrl.port),
          user: dbUrl.username,
          password: dbUrl.password,
          database: dbUrl.pathname.replace('/', ''),
        });

        const db = drizzle(pool, { schema });

        await db.execute('SELECT 1');
        console.log('✅ DB connected');

        return db;
      },
      inject: [ConfigService],
    };
    return {
      module: DatabaseModule,
      imports: [ConfigModule], // 👈 مهم جدًا
      providers: [drizzleProvider],
      exports: [drizzleProvider],
    };
  }
}
