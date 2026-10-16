import type { Sticky } from "./model";

export type StickyColor = { id: string; name: string; hex: string; ink: string };

const DARK_INK = "#333129";
const LIGHT_INK = "#FFFFFF";

const c = (id: string, name: string, hex: string, ink: string = DARK_INK): StickyColor => ({ id, name, hex, ink });

/** The 12 sticky presets, in picker order (4 per row). */
export const STICKY_COLORS: readonly StickyColor[] = [
  c("yellow", "Yellow", "#F7D000"),
  c("orange", "Orange", "#FFDEB9"),
  c("red", "Red", "#FFD7CF"),
  c("pink", "Pink", "#FFD5EE"),
  c("purple", "Purple", "#F3DDFF"),
  c("light-blue", "Light blue", "#BBF0FF"),
  c("dark-blue", "Dark blue", "#3263C3", LIGHT_INK),
  c("light-green", "Light green", "#D4F3C4"),
  c("dark-green", "Dark green", "#008135", LIGHT_INK),
  c("brown", "Brown", "#E7CBB9"),
  c("black", "Black", "#141310", LIGHT_INK),
  c("white", "White", "#FFFFFF"),
];

export const DEFAULT_STICKY_COLOR = STICKY_COLORS[0].hex;
export const PRESET_HEXES: ReadonlySet<string> = new Set(STICKY_COLORS.map((p) => p.hex));

const BY_HEX = new Map(STICKY_COLORS.map((p) => [p.hex, p]));

/** The sticky's preset; a missing or unknown colour is Yellow. */
export function colorOf(sticky: Pick<Sticky, "color">): StickyColor {
  return (sticky.color && BY_HEX.get(sticky.color.toUpperCase())) || STICKY_COLORS[0];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text colour for a fill: the preset's ink, else whichever of dark/light has more contrast. */
export function inkFor(hex: string): string {
  const preset = BY_HEX.get(hex.toUpperCase());
  if (preset) return preset.ink;
  const l = luminance(hex);
  const dark = (l + 0.05) / (luminance(DARK_INK) + 0.05);
  const light = 1.05 / (l + 0.05);
  return dark >= light ? DARK_INK : LIGHT_INK;
}
