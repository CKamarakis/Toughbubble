import { redirect } from "next/navigation";
import { SettingsProvider } from "@/components/workspace/settings-context";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { withUserDb } from "@/db/client";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { loadSettings } from "@/lib/settings/operations";
import { loadActiveTree } from "@/lib/tree/operations";
import { getUserClaims } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects without a session; check again here so the
  // workspace never renders for an unverified user.
  const claims = await getUserClaims();
  if (!claims) redirect(SIGN_IN_PATH);

  // The whole active tree (tree design D1) and the user's settings (notes D9),
  // in one transaction.
  const { rows, settings } = await withUserDb(async (tx) => ({
    rows: await loadActiveTree(tx),
    settings: await loadSettings(tx),
  }));

  return (
    <WorkspaceProvider email={claims.email ?? "Account"} rows={rows}>
      <SettingsProvider initial={settings}>
        <WorkspaceShell>{children}</WorkspaceShell>
      </SettingsProvider>
    </WorkspaceProvider>
  );
}
