import { STICKY } from "@/lib/storms/model";

/** The generated family name `next/font` registered for Geist. */
export function resolveFontFamily(el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue("--font-geist-sans").trim();
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
