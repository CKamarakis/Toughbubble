// Applies pending database migrations during a Vercel build, before the new
// version goes live: previews migrate the dev project, production the prod
// project (DATABASE_ADMIN_URL is set per environment in Vercel). Local builds
// skip this; run `npm run db:migrate` yourself.
import { execSync } from "node:child_process";

if (process.env.VERCEL !== "1") process.exit(0);

if (!process.env.DATABASE_ADMIN_URL) {
  // Failing keeps the current version live instead of shipping code ahead of its schema.
  console.error(
    `DATABASE_ADMIN_URL is not set for the Vercel ${process.env.VERCEL_ENV ?? "unknown"} environment; ` +
      "refusing to build without applying migrations. Add it in Vercel → Settings → Environment Variables.",
  );
  process.exit(1);
}

console.log(`Applying migrations (${process.env.VERCEL_ENV})…`);
execSync("npx drizzle-kit migrate", { stdio: "inherit" });
