import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set a new password · ToughBubble" };

// Reached from a password-reset email link (which signs the user in) or by a
// signed-in user; proxy.ts requires a session. Lives in the (auth) group so the
// workspace never shows until the new password is saved.
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Set a new password</h1>
      <ResetPasswordForm />
      {/* A plain POST, like the account menu's sign-out. */}
      <form action="/auth/sign-out" method="post" className="text-center text-sm text-muted-foreground">
        Not now?{" "}
        <button type="submit" className="font-medium text-foreground underline underline-offset-4">
          Sign out
        </button>
      </form>
    </>
  );
}
