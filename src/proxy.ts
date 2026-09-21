import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decideRoute } from "@/lib/auth/routing";

// Runs before every matched request: refreshes the Supabase session cookie and
// keeps visitors without a session out of the workspace. Pages and data
// access still verify the user themselves; this is not the only check.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          authHeaders = headers;
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // Verifies the JWT (and refreshes it if about to expire). Do not put code
  // between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const decision = decideRoute(pathname, search, signedIn);

  if (decision.type === "redirect") {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url));
    // Carry refreshed or cleared auth cookies onto the redirect.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    for (const [key, value] of Object.entries(authHeaders)) redirect.headers.set(key, value);
    return redirect;
  }

  if (decision.isProtected) {
    // Workspace pages must never be served from a cache (including the
    // back/forward cache after sign-out).
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js assets and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
