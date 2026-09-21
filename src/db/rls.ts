import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type UserTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]>[0];

/** Verified JWT claims; `sub` is the user id that auth.uid() returns. */
export type UserClaims = { sub: string } & Record<string, unknown>;

// One pool per server process, reused across hot reloads in development.
const globalForDb = globalThis as unknown as { requestSql?: postgres.Sql };

function requestDb() {
  if (!globalForDb.requestSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // The Supabase transaction pooler does not support prepared statements.
    globalForDb.requestSql = postgres(url, { prepare: false });
  }
  return drizzle(globalForDb.requestSql, { schema });
}

/**
 * Runs `fn` in a transaction as the given user, with row-level security
 * applied: the role is dropped to `authenticated` and the claims are exposed
 * to auth.uid(). Both settings are transaction-local, so pooled connections
 * never leak them. Passing null runs as `anon`, which sees no workspace data.
 *
 * Callers must pass claims that were verified (see withUserDb).
 */
export function runAsUser<T>(claims: UserClaims | null, fn: (tx: UserTx) => Promise<T>) {
  const role = claims ? "authenticated" : "anon";
  const claimsJson = claims ? JSON.stringify(claims) : "";

  return requestDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${claimsJson}, true), set_config('role', ${role}, true)`,
    );
    return fn(tx);
  });
}
