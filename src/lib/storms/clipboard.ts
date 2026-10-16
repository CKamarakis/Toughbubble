import { BOARD_LIMIT, MAX_FONT_PX, MAX_TEXT, MIN_FONT_PX } from "./limits";
import { STICKY, topZ, type Items, type Point, type Sticky } from "./model";
import { DEFAULT_STICKY_COLOR, PRESET_HEXES } from "./palette";

/** The clipboard type a copied sticky travels under, next to its plain text (D1). */
export const COPIED_STICKY_TYPE = "application/x-toughbubble-sticky+json";
const VERSION = 1;

/** What a copy carries: no id and no position. */
export type CopiedSticky = { text: string; color?: string; fontSize?: number; w: number; h: number };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isSide = (v: unknown): v is number => isNum(v) && v > 0 && v <= BOARD_LIMIT;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The custom-type payload for `s`: `{ v: 1, sticky: { text, color?, fontSize?, w, h } }`. */
export function serializeSticky(s: Sticky): string {
  const sticky: CopiedSticky = {
    text: s.text,
    ...(s.color !== undefined && { color: s.color }),
    ...(s.fontSize !== undefined && { fontSize: s.fontSize }),
    w: s.w,
    h: s.h,
  };
  return JSON.stringify({ v: VERSION, sticky });
}

/**
 * A copied sticky from the custom-type payload, or null when it is not one this version
 * accepts: a preset colour, a whole size 8-64, text up to 500 characters, sides within the board.
 */
export function parseCopiedSticky(json: string): CopiedSticky | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const { v, sticky } = raw as Record<string, unknown>;
  if (v !== VERSION || typeof sticky !== "object" || sticky === null || Array.isArray(sticky)) return null;
  const { text, color, fontSize, w, h } = sticky as Record<string, unknown>;
  if (typeof text !== "string" || text.length > MAX_TEXT) return null;
  if (!isSide(w) || !isSide(h)) return null;
  const out: CopiedSticky = { text, w, h };
  if (color !== undefined) {
    if (typeof color !== "string" || !PRESET_HEXES.has(color)) return null;
    out.color = color;
  }
  if (fontSize !== undefined) {
    if (!Number.isInteger(fontSize) || (fontSize as number) < MIN_FONT_PX || (fontSize as number) > MAX_FONT_PX) return null;
    out.fontSize = fontSize as number;
  }
  return out;
}

/**
 * A default-size sticky for plain text pasted from elsewhere: its first 500 characters,
 * in `color` (the colour for new stickies; Yellow is stored as no colour).
 */
export function stickyFromText(text: string, color: string): CopiedSticky {
  return {
    text: text.slice(0, MAX_TEXT),
    ...(color !== DEFAULT_STICKY_COLOR && { color }),
    w: STICKY.size,
    h: STICKY.size,
  };
}

/** A new sticky from `copied`, centred on `centre` (clamped inside the board), above every item. */
export function placeCopy(copied: CopiedSticky, centre: Point, items: Items): Sticky {
  const { text, color, fontSize, w, h } = copied;
  return {
    id: crypto.randomUUID(),
    type: "sticky",
    x: clamp(centre.x - w / 2, -BOARD_LIMIT, BOARD_LIMIT - w),
    y: clamp(centre.y - h / 2, -BOARD_LIMIT, BOARD_LIMIT - h),
    z: topZ(items),
    w,
    h,
    text,
    ...(color !== undefined && { color }),
    ...(fontSize !== undefined && { fontSize }),
  };
}
