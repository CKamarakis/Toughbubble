export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 96;
export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72] as const;

/**
 * A whole-pixel size within 8–96 from "24", "24px", "18pt", or 24; null for
 * anything else (other units, out of range, not a number). Points are
 * converted (1pt = 4/3 px) so sizes pasted from Word or Docs survive.
 */
export function parseFontSize(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  const match = String(input).trim().match(/^(\d+(?:\.\d+)?)\s*(px|pt)?$/i);
  if (!match) return null;
  const value = Number(match[1]) * (match[2]?.toLowerCase() === "pt" ? 4 / 3 : 1);
  const px = Math.round(value);
  return px >= FONT_SIZE_MIN && px <= FONT_SIZE_MAX ? px : null;
}

export const toCssSize = (px: number) => `${px}px`;
