import { STICKY, type Sticky } from "./model";

export const LINE_HEIGHT_RATIO = 1.3;

/** Breaks on spaces and `\n`; a word wider than `maxWidth` breaks by character. */
export function wrapText(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const push = () => {
      lines.push(line);
      line = "";
    };
    for (const word of paragraph.split(" ")) {
      if (word === "") continue;
      const joined = line === "" ? word : `${line} ${word}`;
      if (measure(joined) <= maxWidth) {
        line = joined;
        continue;
      }
      if (line !== "") push();
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let n = 1;
        while (n < rest.length - 1 && measure(rest.slice(0, n + 1)) <= maxWidth) n++;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    push();
  }
  return lines;
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
