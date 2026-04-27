import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DatabaseService } from './database.service';
import { DRIZZLE_DB } from './database.constants';

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
          max: 20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });

        const db = drizzle(pool, { schema });

        await db.execute('SELECT 1');
        console.log('PostgreSQL connected');

        return db;
      },
      inject: [ConfigService],
    };

    return {
      module: DatabaseModule,
      imports: [
        ConfigModule,
      ],
      providers: [drizzleProvider, DatabaseService],
      exports: [drizzleProvider, DatabaseService],
    };
  }
}
