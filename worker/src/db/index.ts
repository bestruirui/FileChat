// Drizzle ORM Database Instance
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Env } from '../types';

export type Database = DrizzleD1Database<typeof schema>;

/**
 * Create a Drizzle instance from Cloudflare D1 binding
 */
export function getDb(env: Env): Database {
    return drizzle(env.DB, { schema });
}

// Re-export schema
export * from './schema';
