import { getUserClaims } from "@/lib/supabase/server";
import { runAsUser, type UserClaims, type UserTx } from "./rls";

export type { UserTx } from "./rls";

export class UnauthenticatedError extends Error {
  constructor() {
    super("No valid session");
    this.name = "UnauthenticatedError";
  }
}

/**
 * The only database entry point for request handlers, Server Components, and
 * Server Actions. Verifies the session, then runs `fn` as that user with RLS
 * enforced. Throws UnauthenticatedError without a valid session, before any
 * query runs.
 */
export async function withUserDb<T>(fn: (tx: UserTx) => Promise<T>): Promise<T> {
  const claims = await getUserClaims();
  if (!claims?.sub) throw new UnauthenticatedError();
  return runAsUser(claims as UserClaims, fn);
}
