import { parseHexColor } from "@/lib/color";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/notes/font-size";

// Per-element note styles from Settings (design D6/D9). Missing entries mean
// "built-in size" and "Automatic" color, so resetting just deletes the key.

export const STYLE_ELEMENTS = ["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const;
export type StyleElement = (typeof STYLE_ELEMENTS)[number];

export const ELEMENT_LABELS: Record<StyleElement, string> = {
  p: "Paragraph",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  h6: "Heading 6",
};

export const BUILT_IN_SIZES: Record<StyleElement, number> = {
  p: 16,
  h1: 36,
  h2: 30,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
};

export type ElementStyle = { size?: number; color?: string };
export type EditorStyles = Partial<Record<StyleElement, ElementStyle>>;

const isElement = (key: string): key is StyleElement => (STYLE_ELEMENTS as readonly string[]).includes(key);
const isSize = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= FONT_SIZE_MIN && (v as number) <= FONT_SIZE_MAX;

/**
 * Strict check for writes: only known elements, sizes 8–96, colors as hex.
 * Returns the cleaned styles (colors lowercased, empty entries dropped) or null.
 */
export function parseEditorStyles(input: unknown): EditorStyles | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: EditorStyles = {};
  for (const [key, value] of Object.entries(input)) {
    if (!isElement(key) || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const entry: ElementStyle = {};
    for (const [prop, v] of Object.entries(value)) {
      if (prop === "size" && isSize(v)) entry.size = v;
      else if (prop === "color" && typeof v === "string" && parseHexColor(v) && v.startsWith("#")) {
        entry.color = parseHexColor(v)!;
      } else return null;
    }
    if (entry.size !== undefined || entry.color !== undefined) out[key] = entry;
  }
  return out;
}

/** Lenient read of stored styles: keeps valid parts, ignores the rest. */
export function readEditorStyles(input: unknown): EditorStyles {
  if (!input || typeof input !== "object") return {};
  const out: EditorStyles = {};
  for (const key of STYLE_ELEMENTS) {
    const value = (input as Record<string, unknown>)[key];
    if (!value || typeof value !== "object") continue;
    const { size, color } = value as Record<string, unknown>;
    const entry: ElementStyle = {};
    if (isSize(size)) entry.size = size;
    const hex = typeof color === "string" ? parseHexColor(color) : null;
    if (hex) entry.color = hex;
    if (entry.size !== undefined || entry.color !== undefined) out[key] = entry;
  }
  return out;
}

export const effectiveSize = (styles: EditorStyles, el: StyleElement) => styles[el]?.size ?? BUILT_IN_SIZES[el];

/** Returns new styles with `patch` applied to one element; undefined values reset that property. */
export function withElementStyle(styles: EditorStyles, el: StyleElement, patch: ElementStyle): EditorStyles {
  const merged: ElementStyle = { ...styles[el], ...patch };
  const entry: ElementStyle = {};
  if (merged.size !== undefined && merged.size !== BUILT_IN_SIZES[el]) entry.size = merged.size;
  if (merged.color) entry.color = merged.color;
  const next = { ...styles };
  if (entry.size === undefined && entry.color === undefined) delete next[el];
  else next[el] = entry;
  return next;
}

/** CSS custom properties for the editor root (only for elements the user changed). */
export function editorStyleVariables(styles: EditorStyles): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const el of STYLE_ELEMENTS) {
    const s = styles[el];
    if (s?.size !== undefined) vars[`--tb-${el}-size`] = `${s.size}px`;
    if (s?.color) vars[`--tb-${el}-color`] = s.color;
  }
  return vars;
}
