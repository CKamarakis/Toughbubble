import { parseHexColor } from "@/lib/color";

export const MAX_SAVED_COLORS = 20;

/** Adds a color to the front; an existing one moves to the front. Oldest dropped past 20. */
export function addSavedColor(list: string[], color: string): string[] {
  const hex = parseHexColor(color);
  if (!hex) return list;
  return [hex, ...list.filter((c) => c !== hex)].slice(0, MAX_SAVED_COLORS);
}

export const removeSavedColor = (list: string[], color: string) => list.filter((c) => c !== parseHexColor(color));

/** Strict check for writes: an array of at most 20 unique hex colors. */
export function parseSavedColors(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_SAVED_COLORS) return null;
  const out: string[] = [];
  for (const value of input) {
    const hex = typeof value === "string" ? parseHexColor(value) : null;
    if (!hex || !value.startsWith("#") || out.includes(hex)) return null;
    out.push(hex);
  }
  return out;
}

/** Lenient read of the stored list. */
export function readSavedColors(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const value of input) {
    const hex = typeof value === "string" ? parseHexColor(value) : null;
    if (hex && !out.includes(hex)) out.push(hex);
  }
  return out.slice(0, MAX_SAVED_COLORS);
}
