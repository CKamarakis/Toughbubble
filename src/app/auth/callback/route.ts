import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

// Fallback for email links that carry a PKCE `code` (Supabase's default
// templates). This only works in the browser that started the flow; the
// configured templates use /auth/confirm instead.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const failure = new URL(SIGN_IN_PATH, origin);
  failure.searchParams.set("error", "link");
  return NextResponse.redirect(failure);
}
