import { Pool } from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type DbClient = NodePgDatabase<typeof schema>;

let cachedPool: Pool | null = null;
let cachedDb: DbClient | null = null;

/** Get a PostgreSQL-backed Drizzle client using DATABASE_URL (Docker / Neon / Supabase). */
export function getDb(): DbClient {
  if (cachedDb) return cachedDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env or pass a test PGlite client.");
  }
  cachedPool = new Pool({ connectionString });
  cachedDb = drizzlePg(cachedPool, { schema });
  return cachedDb;
}

export async function closeDb() {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
    cachedDb = null;
  }
}
