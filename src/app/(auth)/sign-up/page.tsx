import type { Metadata } from "next";
import Link from "next/link";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create account · Toughbubble" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Create your account</h1>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={SIGN_IN_PATH} className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}
