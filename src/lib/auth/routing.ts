export const SIGN_IN_PATH = "/sign-in";
export const SIGN_UP_PATH = "/sign-up";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const RESET_PASSWORD_PATH = "/reset-password";

// Pages only for visitors without a session; signed-in users go to the workspace.
const GUEST_ONLY_PATHS = [SIGN_IN_PATH, SIGN_UP_PATH, FORGOT_PASSWORD_PATH];

// Reachable without a session. Everything else requires one.
const PUBLIC_PATHS = [...GUEST_ONLY_PATHS, "/auth/callback", "/auth/confirm", "/auth/sign-out"];

export type RouteDecision =
  | { type: "next"; isProtected: boolean }
  | { type: "redirect"; to: string };

const matches = (paths: string[], pathname: string) =>
  paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Where a request should go, given whether it carries a valid session. */
export function decideRoute(
  pathname: string,
  search: string,
  signedIn: boolean,
): RouteDecision {
  if (signedIn && matches(GUEST_ONLY_PATHS, pathname)) {
    return { type: "redirect", to: "/" };
  }
  if (matches(PUBLIC_PATHS, pathname)) {
    return { type: "next", isProtected: false };
  }
  if (!signedIn) {
    const next = encodeURIComponent(pathname + search);
    const to = pathname === "/" && !search ? SIGN_IN_PATH : `${SIGN_IN_PATH}?next=${next}`;
    return { type: "redirect", to };
  }
  return { type: "next", isProtected: true };
}
