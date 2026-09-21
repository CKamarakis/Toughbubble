export const MIN_PASSWORD_LENGTH = 8;

/** A message for the first problem with a new password, or null if it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  }
  return null;
}

/** Loose check only; Supabase is the authority on what an email address is. */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
