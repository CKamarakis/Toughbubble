import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set a new password · Toughbubble" };

// Reached from a password-reset email link (which signs the user in) or by a
// signed-in user; proxy.ts requires a session.
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-8">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
