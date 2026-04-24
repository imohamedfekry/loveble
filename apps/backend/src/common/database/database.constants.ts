import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_DB = Symbol('DRIZZLE_DB');
export type DrizzleDatabase = NodePgDatabase<typeof schema>;
