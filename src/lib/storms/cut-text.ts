/** True when `text` has no lone surrogate (half an emoji), which Postgres refuses in jsonb. */
export function isWellFormedText(text: string): boolean {
  const t = text as string & { isWellFormed?: () => boolean };
  if (typeof t.isWellFormed === "function") return t.isWellFormed();
  return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text);
}

/** `text` cut to at most `max` UTF-16 units, never inside a character: a cut that leaves half of a pair drops it. */
export function cutText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}
