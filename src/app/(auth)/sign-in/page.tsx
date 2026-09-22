import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/form-message";
import { safeNextPath } from "@/lib/auth/redirect";
import { FORGOT_PASSWORD_PATH, SIGN_UP_PATH } from "@/lib/auth/routing";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · ToughBubble" };

const errorMessages: Record<string, string> = {
  link: "That link is invalid or has expired. Sign in, or request a new link.",
  failed: "Sign-in failed. Please try again.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNextPath(first(params.next));
  const errorKey = first(params.error);
  const linkError = errorKey ? (errorMessages[errorKey] ?? errorMessages.failed) : null;
  const withNext = (path: string) =>
    next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      {linkError && <FormMessage kind="error">{linkError}</FormMessage>}
      <SignInForm next={next} forgotHref={FORGOT_PASSWORD_PATH} />
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={withNext(SIGN_UP_PATH)} className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
