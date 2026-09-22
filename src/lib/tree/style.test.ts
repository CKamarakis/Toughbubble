import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROJECT_COLORS } from "./style";

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
const block = (selector: string) => css.split(`\n${selector} {`)[1].split("\n}")[0];

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Sidebar and page backgrounds per theme (globals.css --sidebar, --background).
const SURFACES = { light: ["#f5f4f2", "#fbfbf9"], dark: ["#22211b", "#333129"] } as const;

describe("project colors", () => {
  it.each(Object.entries(PROJECT_COLORS))("%s is at least 3:1 on sidebar and page in both themes", (_, c) => {
    for (const bg of SURFACES.light) expect(contrast(c.light, bg)).toBeGreaterThanOrEqual(3);
    for (const bg of SURFACES.dark) expect(contrast(c.dark, bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.entries(PROJECT_COLORS))("%s matches the CSS variables in globals.css", (name, c) => {
    expect(block(":root")).toContain(`--project-${name}: ${c.light};`);
    expect(block(".dark")).toContain(`--project-${name}: ${c.dark};`);
  });
});
