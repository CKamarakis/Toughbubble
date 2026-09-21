import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";

// A plain form POST, so the browser does a full page load to sign-in and no
// client-side router cache of workspace pages survives.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(SIGN_IN_PATH, request.nextUrl.origin), { status: 303 });
}
