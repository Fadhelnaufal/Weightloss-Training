import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Mengembalikan instance Drizzle ORM (lazy initialization agar aman saat build).
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (cachedDb) {
    return cachedDb;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Variabel lingkungan DATABASE_URL belum dikonfigurasi.",
    );
  }

  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}
