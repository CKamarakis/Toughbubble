import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Create a new client per request; never share one across requests.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. proxy.ts refreshes the
            // session on every request, so this write is not needed there.
          }
        },
      },
    },
  );
}

/** Verified JWT claims for the signed-in user, or null without a valid session. */
export async function getUserClaims() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return data.claims;
}
