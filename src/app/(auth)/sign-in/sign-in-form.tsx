"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendConfirmation, signIn, type AuthFormState } from "@/lib/auth/actions";

export function SignInForm({ next, forgotHref }: { next: string; forgotHref: string }) {
  const [state, action, pending] = useActionState(signIn, {} as AuthFormState);

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href={forgotHref} className="text-sm text-foreground underline underline-offset-4">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {state.unconfirmedEmail && <ResendConfirmation email={state.unconfirmedEmail} />}
    </div>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, {} as AuthFormState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="email" value={email} />
      {state.notice && <FormMessage kind="notice">{state.notice}</FormMessage>}
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Resend confirmation email"}
      </Button>
    </form>
  );
}
