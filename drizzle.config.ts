import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same .env.local loading as Next.js, so migrations use the app's settings.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Admin connection: migrations need rights the request-path role lacks.
  dbCredentials: { url: process.env.DATABASE_ADMIN_URL ?? "" },
  // Only manage our own tables; Supabase owns auth, storage, and its roles.
  schemaFilter: ["public"],
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
