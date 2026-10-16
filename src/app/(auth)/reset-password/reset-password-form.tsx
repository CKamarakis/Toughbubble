"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { updatePassword, type AuthFormState } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULES_HINT } from "@/lib/auth/validation";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as AuthFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
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
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
