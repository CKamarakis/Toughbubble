"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthFormState } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULES_HINT } from "@/lib/auth/validation";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {} as AuthFormState);

  if (state.notice) return <FormMessage kind="notice">{state.notice}</FormMessage>;

  return (
    <form action={action} className="flex flex-col gap-4">
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          {PASSWORD_RULES_HINT}
        </p>
      </div>
      {state.error && <FormMessage kind="error">{state.error}</FormMessage>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
