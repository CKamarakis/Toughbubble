"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { RESET_PASSWORD_PATH } from "@/lib/auth/routing";
import { looksLikeEmail, passwordProblem } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  notice?: string;
  /** Set when sign-in failed only because the email is unconfirmed. */
  unconfirmedEmail?: string;
  /** Echoed back so the form keeps what the user typed. */
  email?: string;
};

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/**
 * The app origin this request came from (localhost, a Vercel preview, or
 * production). Email links return here; Supabase only honours origins on the
 * project's redirect allowlist.
 */
async function requestOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Where links in auth emails land. Supabase's default templates (which cannot
 * be edited without custom SMTP) send the user back here with a PKCE `code`,
 * exchanged by /auth/callback. That only works in the browser that started the
 * flow. With custom SMTP, switch the templates to /auth/confirm (token_hash),
 * which works in any browser.
 */
async function emailLinkTarget(next: string) {
  const url = new URL("/auth/callback", await requestOrigin());
  if (next !== "/") url.searchParams.set("next", next);
  return url.toString();
}

const CHECK_EMAIL =
  "Check your email for a confirmation link. It may take a minute to arrive; look in spam if it doesn't.";
const RATE_LIMITED = "Too many emails were sent recently. Please wait a few minutes and try again.";
// Supabase's built-in mailer only delivers to the project team's addresses
// until custom SMTP is configured.
const CANNOT_EMAIL = "We can't send email to that address yet. Please use a different one.";
const INVALID_EMAIL = "Enter a valid email address.";

/** Record auth errors the forms don't have a specific message for (never the password). */
function logUnexpected(action: string, error: { code?: string; status?: number; message: string }) {
  console.error(`[auth:${action}] unexpected error`, {
    code: error.code,
    status: error.status,
    message: error.message,
  });
}

export async function signIn(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(field(form, "next"));

  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error: "Confirm your email address before signing in.",
        unconfirmedEmail: email,
        email,
      };
    }
    // Same message for an unknown email and a wrong password.
    if (error.code === "invalid_credentials") {
      return { error: "Email or password is incorrect.", email };
    }
    logUnexpected("sign-in", error);
    return { error: "Sign-in failed. Please try again.", email };
  }

  redirect(next);
}

export async function signUp(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = field(form, "email");
  const password = String(form.get("password") ?? "");

  if (!looksLikeEmail(email)) return { error: "Enter a valid email address.", email };
  const problem = passwordProblem(password);
  if (problem) return { error: problem, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await emailLinkTarget("/") },
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") return { error: RATE_LIMITED, email };
    if (error.code === "email_address_not_authorized") return { error: CANNOT_EMAIL, email };
    if (error.code === "email_address_invalid") return { error: INVALID_EMAIL, email };
    if (error.code === "weak_password") return { error: error.message, email };
    // An existing account must look the same as a new one.
    if (error.code !== "user_already_exists") {
      logUnexpected("sign-up", error);
      return { error: "Sign-up failed. Please try again.", email };
    }
  }
  return { notice: CHECK_EMAIL };
}

export async function resendConfirmation(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = field(form, "email");
  if (!looksLikeEmail(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: await emailLinkTarget("/") },
  });
  if (error?.code === "over_email_send_rate_limit") return { error: RATE_LIMITED, email };
  if (error) logUnexpected("resend-confirmation", error);
  return { notice: "If that account still needs confirming, we've sent a new link.", email };
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const email = field(form, "email");
  if (!looksLikeEmail(email)) return { error: "Enter a valid email address.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await emailLinkTarget(RESET_PASSWORD_PATH),
  });
  if (error?.code === "over_email_send_rate_limit") return { error: RATE_LIMITED, email };
  if (error?.code === "email_address_invalid") return { error: INVALID_EMAIL, email };
  if (error) logUnexpected("password-reset-request", error);
  // Same answer whether or not the account exists.
  return {
    notice: "If an account exists for that email, we've sent a link to reset your password.",
  };
}

export async function updatePassword(
  _prev: AuthFormState,
  form: FormData,
): Promise<AuthFormState> {
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") {
      return { error: "Choose a password different from your current one." };
    }
    if (error.code === "weak_password") return { error: error.message };
    logUnexpected("update-password", error);
    return { error: "Could not update your password. Please try again." };
  }
  redirect("/");
}
