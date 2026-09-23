const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const LOOKS_LIKE_EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

/** Whether an href uses an allowed scheme (http, https, mailto). */
export function isAllowedHref(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    return ALLOWED_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

/**
 * Turns what a user typed into a safe link address, or null if it isn't one.
 * "example.com" becomes https://example.com, "me@x.com" becomes a mailto link,
 * and any scheme other than http, https, or mailto is refused.
 */
export function normalizeLink(input: string): string | null {
  const value = input.trim();
  if (!value || /\s/.test(value)) return null;
  let candidate: string;
  if (HAS_SCHEME.test(value) && !/^[^:]+:\d/.test(value)) candidate = value;
  else if (LOOKS_LIKE_EMAIL.test(value)) candidate = `mailto:${value}`;
  else candidate = `https://${value.replace(/^\/+/, "")}`;
  if (!isAllowedHref(candidate)) return null;
  // http(s) links need a real host, not just a scheme.
  const url = new URL(candidate);
  if (url.protocol !== "mailto:" && !url.hostname.includes(".") && url.hostname !== "localhost") return null;
  return candidate;
}
