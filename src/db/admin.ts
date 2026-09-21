import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// BYPASSES ROW-LEVEL SECURITY. For migrations, test setup, and background jobs
// only. Lint blocks importing this from src/; request code uses withUserDb().
export function createAdminDb() {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is not set");
  const client = postgres(url, { max: 1 });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
