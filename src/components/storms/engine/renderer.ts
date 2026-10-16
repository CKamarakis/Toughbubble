import { boardToScreen, visibleRect } from "@/lib/storms/camera";
import { byZ, STICKY, type Item, type Size } from "@/lib/storms/model";
import { LINE_HEIGHT_RATIO, layoutSticky } from "@/lib/storms/text-layout";
import type { StormStore } from "./store";

const BACKGROUND = "#F2F2F2";
const TEXT_MIN_ZOOM = 0.3;
const SHADOW_MIN_ZOOM = 0.5;
const SHADOW_COLOUR = "rgba(0,0,0,0.12)";
const SELECTION = { colour: "#F700A8", width: 1, gap: 5 };

export type Renderer = {
  resize(size: Size, dpr: number): void;
  setFontReady(): void;
  destroy(): void;
};

export function createRenderer(
  canvas: HTMLCanvasElement,
  store: StormStore,
  family: string,
): Renderer {
  const ctx = canvas.getContext("2d");
  let size: Size = { w: 0, h: 0 };
  let dpr = 1;
  let fontReady = false;
  let frame = 0;
  let destroyed = false;

  const font = `${STICKY.fontPx}px ${family || "sans-serif"}`;
  const measure = (s: string) => ctx?.measureText(s).width ?? 0;

  // Wrapping measures text, which is slow; a sticky's layout changes only with its text and size.
  type Laid = ReturnType<typeof layoutSticky> & { overflows: boolean };
  const layouts = new Map<string, { key: string; layout: Laid }>();
  function layoutOf(s: Item) {
    const key = `${s.w}|${s.h}|${s.text}`;
    const hit = layouts.get(s.id);
    if (hit?.key === key) return hit.layout;
    if (layouts.size > 5000) layouts.clear();
    // Measure in board px with the board font, then put the caller's (screen) font back.
    const previous = ctx?.font;
    if (ctx) ctx.font = font;
    const base = layoutSticky(measure, s);
    const layout = { ...base, overflows: base.lines.some((line) => measure(line) > s.w) };
    if (ctx && previous !== undefined) ctx.font = previous;
    layouts.set(s.id, { key, layout });
    return layout;
  }

  /**
   * A line's baseline below its top, placed as CSS places it in a line box (half the
   * leading above the font's ascent), so canvas text lines up with the textarea overlay.
   */
  function baselineOffset(): number {
    const lineHeight = STICKY.fontPx * LINE_HEIGHT_RATIO;
    if (!ctx) return lineHeight / 2;
    ctx.font = font;
    const m = ctx.measureText("");
    const ascent = m.fontBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent;
    if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
      return lineHeight / 2 + STICKY.fontPx * 0.35;
    }
    return (lineHeight - (ascent + descent)) / 2 + ascent;
  }

  function schedule() {
    if (frame || destroyed) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  function draw() {
    if (!ctx || destroyed || size.w === 0 || size.h === 0) return;
    const snap = store.getSnapshot();
    const { camera, items, selectedId, editingId, dragPreview } = snap;
    const shift = (s: Item): Item =>
      dragPreview && dragPreview.id === s.id
        ? { ...s, x: s.x + dragPreview.dx, y: s.y + dragPreview.dy }
        : s;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size.w, size.h);

    const v = visibleRect(camera, size);
    const visible = Object.values(items)
      .map(shift)
      .filter((s) => s.x < v.x + v.w && s.x + s.w > v.x && s.y < v.y + v.h && s.y + s.h > v.y)
      .sort(byZ);
    const shadows = camera.zoom >= SHADOW_MIN_ZOOM;
    const showText = fontReady && camera.zoom >= TEXT_MIN_ZOOM;
    const z = camera.zoom;
    const baseline = showText ? baselineOffset() : 0;

    // Text state is set once: changing the font per sticky is slow.
    // Drawn at the screen size rather than scaled by a transform, as the textarea overlay is.
    const screenFont = `${STICKY.fontPx * z}px ${family || "sans-serif"}`;
    if (showText) {
      ctx.font = screenFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
    }
    if (shadows) {
      ctx.shadowBlur = 8 * dpr;
      ctx.shadowOffsetY = 2 * dpr;
    }

    for (const s of visible) {
      const p = boardToScreen(camera, size, s);
      if (shadows) ctx.shadowColor = SHADOW_COLOUR;
      ctx.fillStyle = STICKY.fill;
      ctx.fillRect(p.x, p.y, s.w * z, s.h * z);
      if (shadows) ctx.shadowColor = "transparent";

      // The text overlay shows the text of the sticky being edited.
      if (showText && s.text !== "" && s.id !== editingId) {
        const { lines, lineHeight, top, overflows } = layoutOf(s);
        // Only a line wider than the sticky (one long word) needs clipping to it.
        if (overflows) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x, p.y, s.w * z, s.h * z);
          ctx.clip();
        }
        ctx.fillStyle = STICKY.text;
        const cx = p.x + (s.w / 2) * z;
        lines.forEach((line, i) => {
          ctx.fillText(line, cx, p.y + (top + i * lineHeight + baseline) * z);
        });
        if (overflows) ctx.restore();
      }
    }
    ctx.shadowColor = "transparent";

    const found = selectedId ? items[selectedId] : undefined;
    const selected = found && shift(found);
    if (selected) {
      const p = boardToScreen(camera, size, selected);
      // Centre the 1 px line half a pixel further out so its inner edge is exactly `gap` from the sticky.
      const g = SELECTION.gap + SELECTION.width / 2;
      ctx.strokeStyle = SELECTION.colour;
      ctx.lineWidth = SELECTION.width;
      ctx.strokeRect(p.x - g, p.y - g, selected.w * z + 2 * g, selected.h * z + 2 * g);
    }
  }

  const off = store.onFrame(schedule);

  return {
    resize(next, nextDpr) {
      size = next;
      dpr = nextDpr;
      canvas.width = Math.max(1, Math.round(next.w * nextDpr));
      canvas.height = Math.max(1, Math.round(next.h * nextDpr));
      // Resizing clears the canvas, so draw now rather than waiting for a frame.
      draw();
      schedule();
    },
    setFontReady() {
      fontReady = true;
      layouts.clear();
      schedule();
    },
    destroy() {
      destroyed = true;
      off();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
