export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const RESET_PASSWORD_PATH = "/reset-password";

// Set when a password-reset email link signs the user in; cleared once the new
// password is saved or they sign out. While set, the workspace stays closed.
// A guard for the normal flow, not a security boundary: whoever holds the email
// link can set a password anyway.
export const RESET_PENDING_COOKIE = "tb-reset-pending";
export const RESET_PENDING_MAX_AGE = 60 * 60 * 24;

// Pages only for visitors without a session; signed-in users go to the workspace.
const GUEST_ONLY_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH, FORGOT_PASSWORD_PATH];

// Reachable without a session. Everything else requires one.
const PUBLIC_PATHS = [...GUEST_ONLY_PATHS, "/auth/callback", "/auth/confirm", "/auth/sign-out"];

// Development-only pages (the speed-gate benchmark). Never public in production.
const DEV_PUBLIC_PATHS = ["/dev"];

export type RouteDecision =
  | { type: "next"; isProtected: boolean }
  | { type: "redirect"; to: string };

const matches = (paths: string[], pathname: string) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Where a request should go, given whether it carries a valid session and
 * whether a password reset is still pending.
 */
export function decideRoute(
  pathname: string,
  search: string,
  signedIn: boolean,
  resetPending = false,
): RouteDecision {
  if (
    signedIn &&
    resetPending &&
    !matches([RESET_PASSWORD_PATH, "/auth"], pathname)
  ) {
    return { type: "redirect", to: RESET_PASSWORD_PATH };
  }
  if (signedIn && matches(GUEST_ONLY_PATHS, pathname)) {
    return { type: "redirect", to: "/" };
  }
  if (
    matches(PUBLIC_PATHS, pathname) ||
    (process.env.NODE_ENV !== "production" && matches(DEV_PUBLIC_PATHS, pathname))
  ) {
    return { type: "next", isProtected: false };
  }
  if (!signedIn) {
    const next = encodeURIComponent(pathname + search);
    const to = pathname === "/" && !search ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${next}`;
    return { type: "redirect", to };
  }
  return { type: "next", isProtected: true };
}
