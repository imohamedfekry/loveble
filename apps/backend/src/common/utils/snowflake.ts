import { Snowflake } from '@sapphire/snowflake';

/** Custom epoch so IDs stay sortable and distinct across environments (do not change after production data exists). */
const SNOWFLAKE_EPOCH = new Date('2025-10-16T00:00:00.000Z');

export const snowflake = new Snowflake(SNOWFLAKE_EPOCH);

/**
 * Next sortable unique id (BigInt) for Prisma `@id` fields backed by snowflakes.
 */
export function nextSnowflakeId(): bigint {
  return snowflake.generate();
}
