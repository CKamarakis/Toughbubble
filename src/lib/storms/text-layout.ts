import { STICKY, type Sticky } from "./model";

export const LINE_HEIGHT_RATIO = 1.3;

/**
 * Wraps like a textarea with `white-space: pre-wrap; overflow-wrap: break-word`:
 * breaks after runs of spaces and at `\n`, keeps every space, and breaks a word wider
 * than `maxWidth` by character. Spaces never cause a wrap: at a soft wrap they hang
 * past the edge (so they are dropped from the line, as they are neither drawn nor
 * centred); at a paragraph end they are kept as far as they fit.
 */
export function wrapText(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const token of paragraph.match(/ +|[^ ]+/g) ?? []) {
      if (token[0] === " ") {
        line += token;
        continue;
      }
      const joined = line + token;
      if (measure(joined) <= maxWidth) {
        line = joined;
        continue;
      }
      if (line !== "") lines.push(line.trimEnd());
      let rest = token;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let n = 1;
        while (n < rest.length - 1 && measure(rest.slice(0, n + 1)) <= maxWidth) n++;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    lines.push(fitTrailingSpaces(measure, line, maxWidth));
  }
  return lines;
}

/** Drops the trailing spaces that don't fit (they hang); binary search keeps long runs cheap. */
function fitTrailingSpaces(measure: (s: string) => number, line: string, maxWidth: number): string {
  if (!line.endsWith(" ") || measure(line) <= maxWidth) return line;
  const base = line.trimEnd();
  let lo = 0;
  let hi = line.length - base.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(base + " ".repeat(mid)) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return base + " ".repeat(lo);
}

/** `top` is the first line's top edge in board px from the sticky's top. */
export function layoutSticky(
  measure: (s: string) => number,
  s: Sticky,
): { lines: string[]; lineHeight: number; top: number } {
  const lineHeight = STICKY.fontPx * LINE_HEIGHT_RATIO;
  const maxLines = Math.max(0, Math.floor((s.h - 2 * STICKY.padding) / lineHeight));
  const lines = wrapText(measure, s.text, s.w - 2 * STICKY.padding).slice(0, maxLines);
  return { lines, lineHeight, top: (s.h - lines.length * lineHeight) / 2 };
}
