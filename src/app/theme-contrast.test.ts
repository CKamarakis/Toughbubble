import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reads the real token values from globals.css so the test fails if a token
// is later changed to a color that breaks WCAG AA.
const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function tokens(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(`^${escaped} \\{([^}]*)\\}`, "m"));
  if (!block) throw new Error(`No ${selector} block in globals.css`);
  const out: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    out[name] = value.trim();
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text token, background token]
const pairs: [string, string][] = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["link", "background"],
  ["highlight-text", "background"],
  ["highlight-text", "sidebar"],
  ["destructive", "background"],
  ["success", "background"],
  ["warning", "background"],
  ["sidebar-foreground", "sidebar"],
  ["muted-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s theme text contrast", (_theme, selector) => {
  const t = tokens(selector);

  it.each(pairs)("%s on %s is at least 4.5:1", (fg, bg) => {
    expect(t[fg], `missing --${fg}`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(t[bg], `missing --${bg}`).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  // Non-text UI boundaries (form fields) need 3:1 (WCAG 1.4.11).
  it.each(["background", "card"])("input border on %s is at least 3:1", (bg) => {
    expect(contrast(t.input, t[bg])).toBeGreaterThanOrEqual(3);
  });
});
