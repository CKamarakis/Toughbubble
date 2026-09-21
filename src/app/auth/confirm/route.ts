import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { RESET_PASSWORD_PATH, SIGN_IN_PATH } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

// Links in confirmation and password-reset emails land here. Verifying the
// token_hash server-side works in any browser, unlike a PKCE code, which only
// works in the browser that started the flow.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const fallback = type === "recovery" ? RESET_PASSWORD_PATH : "/";
      const next = searchParams.has("next") ? safeNextPath(searchParams.get("next")) : fallback;
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const failure = new URL(SIGN_IN_PATH, origin);
  failure.searchParams.set("error", "link");
  return NextResponse.redirect(failure);
}
