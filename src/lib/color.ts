const HEX = /^#[0-9a-f]{6}$/i;

/** "#1A7F5A" -> "#1a7f5a"; a bare "1a7f5a" is accepted too. Null if not a 6-digit hex color. */
export function parseHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim().startsWith("#") ? input.trim() : `#${input.trim()}`;
  return HEX.test(value) ? value.toLowerCase() : null;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Page backgrounds in light and dark mode (globals.css --background). */
export const PAGE_BACKGROUNDS = { light: "#fbfbf9", dark: "#333129" } as const;

/**
 * Themes where `color` falls below 4.5:1 against the given backgrounds. With
 * `only`, just that theme is checked (a color used in one theme only).
 */
export function hardToReadIn(
  color: string,
  backgrounds: { light: string; dark: string } = PAGE_BACKGROUNDS,
  only?: "light" | "dark",
): ("light" | "dark")[] {
  const themes = only ? [only] : (["light", "dark"] as const);
  return themes.filter((theme) => contrastRatio(color, backgrounds[theme]) < 4.5);
}
