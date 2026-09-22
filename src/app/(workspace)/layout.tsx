import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { withUserDb } from "@/db/client";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { loadActiveTree } from "@/lib/tree/operations";
import { getUserClaims } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects without a session; check again here so the
  // workspace never renders for an unverified user.
  const claims = await getUserClaims();
  if (!claims) redirect(SIGN_IN_PATH);

  // The whole active tree, once per navigation (design D1).
  const rows = await withUserDb(loadActiveTree);

  return (
    <WorkspaceProvider email={claims.email ?? "Account"} rows={rows}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
