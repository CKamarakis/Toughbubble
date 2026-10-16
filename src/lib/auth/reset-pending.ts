import type { NextResponse } from "next/server";
import { RESET_PENDING_COOKIE, RESET_PENDING_MAX_AGE } from "@/lib/auth/routing";

/** Keeps the workspace closed until the user sets a new password (see routing.ts). */
export function markResetPending(response: NextResponse) {
  response.cookies.set(RESET_PENDING_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESET_PENDING_MAX_AGE,
  });
}
