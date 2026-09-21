export const MIN_PASSWORD_LENGTH = 8;

// Must match the Supabase projects' password requirements (Authentication >
// Sign In / Providers > Email): lowercase, uppercase, digit, and symbol.
// Supabase counts only these characters as symbols.
const SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export const PASSWORD_RULES_HINT =
  `At least ${MIN_PASSWORD_LENGTH} characters, with a lowercase letter, an uppercase letter, ` +
  "a number, and a symbol.";

/** A message for the first problem with a new password, or null if it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }
  const missing = [
    !/[a-z]/.test(password) && "a lowercase letter",
    !/[A-Z]/.test(password) && "an uppercase letter",
    !/[0-9]/.test(password) && "a number",
    ![...password].some((c) => SYMBOLS.includes(c)) && "a symbol",
  ].filter(Boolean);
  if (missing.length > 0) {
    return `Your password needs ${joinList(missing as string[])}.`;
  }
  return null;
}

function joinList(items: string[]) {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** Loose check only; Supabase is the authority on what an email address is. */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
