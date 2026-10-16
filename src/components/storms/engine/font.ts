import { STICKY } from "@/lib/storms/model";
import { REF_FONT_PX, scaleMeasure, type SizedMeasure } from "@/lib/storms/text-layout";

/** The generated family name `next/font` registered for Geist. */
export function resolveFontFamily(el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue("--font-geist-sans").trim();
}

/** The canvas font the board measures sticky text with, at the reference size. */
export function refFont(family: string): string {
  return `${REF_FONT_PX}px ${family || "sans-serif"}`;
}

/**
 * Measures text in board px with the board font, on a canvas of its own: the store
 * fits text with it, and the text overlay lays out with it, as the renderer does.
 */
export function createBoardMeasure(family: string): SizedMeasure {
  const ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  const font = refFont(family);
  return scaleMeasure((s) => {
    if (!ctx) return 0;
    ctx.font = font; // cheap when unchanged; keeps the font if the canvas was reset
    return ctx.measureText(s).width;
  });
}

/** Resolves once the font is loaded; also when `document.fonts` is missing or loading fails. */
export async function waitForFont(family: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${STICKY.fontPx}px ${family}`);
  } catch {
    // Draw with the fallback font rather than never drawing text.
  }
}
