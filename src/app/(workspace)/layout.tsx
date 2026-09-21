import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { getUserClaims } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: LayoutProps<"/">) {
  // proxy.ts already redirects without a session; check again here so the
  // workspace never renders for an unverified user.
  const claims = await getUserClaims();
  if (!claims) redirect(SIGN_IN_PATH);

  const email = claims.email ?? "Account";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b bg-sidebar px-4 py-2">
        <span className="font-semibold">Toughbubble</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium"
            >
              {email.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm sm:inline">{email}</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
