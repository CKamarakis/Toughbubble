import type { Metadata } from "next";
import Link from "next/link";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset password · Toughbubble" };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        <Link href={SIGN_IN_PATH} className="font-medium text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
