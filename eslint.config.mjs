import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // App code reaches the database only through withUserDb() (@/db/client),
    // which verifies the session and enforces RLS. The admin client bypasses
    // RLS and runAsUser() skips session verification.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/db/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db/admin", "@/db/rls", "**/db/admin", "**/db/rls"],
              message: "Use withUserDb() from @/db/client in app code.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
