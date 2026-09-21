import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createAdminDb } from "@/db/admin";
import { runAsUser, type UserClaims, type UserTx } from "@/db/rls";

function authAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.admin;
}

export type TestUser = {
  id: string;
  /** Run queries as this user, with RLS enforced, exactly as withUserDb does. */
  run: <T>(fn: (tx: UserTx) => Promise<T>) => Promise<T>;
};

/** Creates a throwaway confirmed user in the dev project. */
export async function createTestUser(): Promise<TestUser> {
  const { data, error } = await authAdmin().createUser({
    email: `it-${randomUUID()}@toughbubble.test`,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  const claims: UserClaims = { sub: data.user.id, role: "authenticated" };
  return { id: data.user.id, run: (fn) => runAsUser(claims, fn) };
}

export async function deleteTestUser(user: TestUser) {
  const { error } = await authAdmin().deleteUser(user.id);
  if (error && error.status !== 404) throw error;
}

/** Runs queries with no session, as an anonymous visitor would. */
export const runAnonymous = <T>(fn: (tx: UserTx) => Promise<T>) => runAsUser(null, fn);

/** RLS-bypassing access for assertions the users themselves cannot make. */
export async function withAdminDb<T>(fn: (db: ReturnType<typeof createAdminDb>["db"]) => Promise<T>) {
  const admin = createAdminDb();
  try {
    return await fn(admin.db);
  } finally {
    await admin.close();
  }
}
