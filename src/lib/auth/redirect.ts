const FALLBACK = "/";

/**
 * Returns `next` only if it is a same-origin relative path, so the sign-in
 * flow cannot be used as an open redirect. Anything else becomes "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return FALLBACK;
  // "//evil.com" and "/\evil.com" are protocol-relative in browsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return FALLBACK;

  const base = "http://internal.invalid";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return FALLBACK;
  }
  if (url.origin !== base) return FALLBACK;
  return url.pathname + url.search + url.hash;
}
