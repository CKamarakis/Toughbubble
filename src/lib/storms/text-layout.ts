import { MAX_FONT_PX, MIN_FONT_PX } from "./limits";
import { STICKY, type Sticky } from "./model";

export const LINE_HEIGHT_RATIO = 1.3;

/**
 * Text is measured once at this font size and scaled linearly to the size wanted, so
 * one canvas font setting serves every size (`next/font` serves fixed outlines, whose
 * widths scale linearly with size).
 */
export const REF_FONT_PX = 100;

/** Width in board px of `s` drawn at `fontPx`. */
export type SizedMeasure = (s: string, fontPx: number) => number;

/** A `SizedMeasure` from a measure of text drawn at `REF_FONT_PX`. */
export function scaleMeasure(measureAtRef: (s: string) => number): SizedMeasure {
  return (s, fontPx) => (measureAtRef(s) * fontPx) / REF_FONT_PX;
}

const at = (measure: SizedMeasure, fontPx: number) => (s: string) => measure(s, fontPx);

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

function fits(measure: SizedMeasure, text: string, w: number, h: number, fontPx: number): boolean {
  const maxWidth = w - 2 * STICKY.padding;
  const m = at(measure, fontPx);
  const lines = wrapText(m, text, maxWidth);
  return (
    lines.length * fontPx * LINE_HEIGHT_RATIO <= h - 2 * STICKY.padding &&
    lines.every((line) => m(line) <= maxWidth)
  );
}

/**
 * The largest whole size in [MIN_FONT_PX, MAX_FONT_PX] at which all of `text` fits a
 * `w`×`h` sticky inside its padding; MIN_FONT_PX when it doesn't fit even then (the
 * rest is clipped). Binary search over the sizes: at most 6 wraps.
 */
export function fitFontSize(measure: SizedMeasure, text: string, w: number, h: number): number {
  if (text === "") return MAX_FONT_PX;
  let lo = MIN_FONT_PX;
  let hi = MAX_FONT_PX;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fits(measure, text, w, h, mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Lines at the sticky's stored size, or at its fitted size when none is stored.
 * `top` is the first line's top edge in board px from the sticky's top.
 */
export function layoutSticky(
  measure: SizedMeasure,
  s: Sticky,
): { lines: string[]; lineHeight: number; top: number; fontSize: number } {
  const fontSize = s.fontSize ?? fitFontSize(measure, s.text, s.w, s.h);
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const maxLines = Math.max(0, Math.floor((s.h - 2 * STICKY.padding) / lineHeight));
  const lines = wrapText(at(measure, fontSize), s.text, s.w - 2 * STICKY.padding).slice(0, maxLines);
  return { lines, lineHeight, top: (s.h - lines.length * lineHeight) / 2, fontSize };
}
