import { existsSync } from "node:fs";

// Vitest runs with NODE_ENV=test, where Next's env loader skips .env.local,
// so load it directly. Variables already set in the environment win.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// These tests create and delete real users. Never point them at production.
if (process.env.APP_ENV !== "development") {
  throw new Error(
    `Integration tests only run against the dev project (APP_ENV=development); got APP_ENV=${process.env.APP_ENV ?? "unset"}.`,
  );
}
for (const name of ["DATABASE_URL", "DATABASE_ADMIN_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
  if (!process.env[name]) throw new Error(`${name} must be set in .env.local for integration tests.`);
}
