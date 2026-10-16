import { boardToScreen, visibleRect } from "@/lib/storms/camera";
import { byZ, STICKY, type Item, type Rect, type Size } from "@/lib/storms/model";
import { LINE_HEIGHT_RATIO, REF_FONT_PX, layoutSticky, scaleMeasure } from "@/lib/storms/text-layout";
import { refFont } from "./font";
import type { StormStore } from "./store";

const BACKGROUND = "#F2F2F2";
const TEXT_MIN_ZOOM = 0.3;
const SHADOW_MIN_ZOOM = 0.5;
const SHADOW_COLOUR = "rgba(0,0,0,0.12)";
const SELECTION = { colour: "#F700A8", width: 1, gap: 5 };
/** Board px per cell of the grid that finds overlapping stickies while drawing. */
const CELL = 256;
/** How long after the last zoom change text is redrawn at its exact size. */
const ZOOM_SETTLE_MS = 150;

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
  let lastZoom = NaN;
  let settle: ReturnType<typeof setTimeout> | undefined;

  // Text is measured at a 100 px reference font and scaled, as the store and the text
  // overlay measure it, so all three agree on sizes and lines.
  const font = refFont(family);
  // Widths at the reference font are memoised: a fit tries up to 6 sizes, which wrap the
  // same strings, and boards repeat text. Cleared when the font loads.
  const widths = new Map<string, number>();
  const measure = scaleMeasure((s) => {
    let w = widths.get(s);
    if (w === undefined) {
      if (widths.size > 50_000) widths.clear();
      w = ctx?.measureText(s).width ?? 0;
      widths.set(s, w);
    }
    return w;
  });
  /** The reference font's ascent and descent, read once the font has loaded. */
  let metrics: { ascent: number; descent: number } | null = null;

  // Wrapping and fitting measure text, which is slow; a sticky's layout changes only with
  // its text, size and stored font size. An unsized sticky is fitted here and cached, never
  // written to the store (its size is stored the next time its text changes).
  type Laid = ReturnType<typeof layoutSticky> & { overflows: boolean; baseline: number };
  const layouts = new Map<string, { key: string; layout: Laid }>();
  function layoutOf(s: Item): Laid {
    const key = `${s.w}|${s.h}|${s.fontSize ?? ""}|${s.text}`;
    const hit = layouts.get(s.id);
    if (hit?.key === key) return hit.layout;
    if (layouts.size > 5000) layouts.clear();
    // Measure in board px with the reference font, then put the caller's (screen) font back.
    const previous = ctx?.font;
    if (ctx) ctx.font = font;
    metrics ??= readMetrics();
    const base = layoutSticky(measure, s);
    const layout = {
      ...base,
      overflows: base.lines.some((line) => measure(line, base.fontSize) > s.w),
      baseline: baselineOffset(base.fontSize),
    };
    if (ctx && previous !== undefined) ctx.font = previous;
    layouts.set(s.id, { key, layout });
    return layout;
  }

  function readMetrics() {
    const m = ctx?.measureText("");
    return { ascent: m?.fontBoundingBoxAscent ?? NaN, descent: m?.fontBoundingBoxDescent ?? NaN };
  }

  /**
   * A line's baseline below its top at `fontPx`, placed as CSS places it in a line box
   * (half the leading above the font's ascent), so canvas text lines up with the overlay.
   */
  function baselineOffset(fontPx: number): number {
    const lineHeight = fontPx * LINE_HEIGHT_RATIO;
    const k = fontPx / REF_FONT_PX;
    if (!metrics || !Number.isFinite(metrics.ascent) || !Number.isFinite(metrics.descent)) {
      return lineHeight / 2 + fontPx * 0.35;
    }
    return (lineHeight - (metrics.ascent + metrics.descent) * k) / 2 + metrics.ascent * k;
  }

  type TextJob = { s: Item; p: { x: number; y: number }; layout: Laid };

  /**
   * Draws the queued text grouped by size, so `ctx.font` is set once per size rather than
   * per sticky (changing the font is slow). Drawn at the screen size rather than scaled
   * by a transform, as the textarea overlay is.
   */
  function drawText(jobs: TextJob[], z: number, zooming: boolean) {
    if (!ctx || jobs.length === 0) return;
    const bySize = new Map<number, TextJob[]>();
    for (const job of jobs) {
      const group = bySize.get(job.layout.fontSize);
      if (group) group.push(job);
      else bySize.set(job.layout.fontSize, [job]);
    }
    ctx.fillStyle = STICKY.text;
    for (const [fontPx, group] of bySize) {
      // While zooming, every size is a new fractional font each frame, which is slow with
      // many sizes; whole px repeat across frames. Exact again once the zoom settles.
      const screenPx = zooming ? Math.round(fontPx * z) : fontPx * z;
      ctx.font = `${screenPx}px ${family || "sans-serif"}`;
      for (const { s, p, layout } of group) {
        const { lines, lineHeight, top, overflows, baseline } = layout;
        // Only a line wider than the sticky (one long word) needs clipping to it.
        if (overflows) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x, p.y, s.w * z, s.h * z);
          ctx.clip();
        }
        const cx = p.x + (s.w / 2) * z;
        lines.forEach((line, i) => {
          ctx.fillText(line, cx, p.y + (top + i * lineHeight + baseline) * z);
        });
        if (overflows) ctx.restore();
      }
    }
    jobs.length = 0;
  }

  /** Calls `visit` with each grid cell `r` touches; stops and returns true when it does. */
  function someCell(r: Rect, visit: (key: number) => boolean): boolean {
    for (let cx = Math.floor(r.x / CELL); cx <= Math.floor((r.x + r.w) / CELL); cx++) {
      for (let cy = Math.floor(r.y / CELL); cy <= Math.floor((r.y + r.h) / CELL); cy++) {
        if (visit(cx * 100_000 + cy)) return true;
      }
    }
    return false;
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
    const zooming = z !== lastZoom;
    lastZoom = z;
    if (zooming && showText) {
      clearTimeout(settle);
      settle = setTimeout(schedule, ZOOM_SETTLE_MS);
    }

    if (showText) {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
    }
    if (shadows) {
      ctx.shadowBlur = 8 * dpr;
      ctx.shadowOffsetY = 2 * dpr;
    }

    // Text is queued and drawn grouped by size. A sticky that overlaps one whose text is
    // queued draws the queue first, so text never shows through a sticky above it.
    const jobs: TextJob[] = [];
    const queued = new Map<number, Rect[]>();
    const overlapsQueued = (r: Rect) =>
      someCell(r, (key) =>
        (queued.get(key) ?? []).some(
          (q) => q.x < r.x + r.w && r.x < q.x + q.w && q.y < r.y + r.h && r.y < q.y + q.h,
        ),
      );

    for (const s of visible) {
      const p = boardToScreen(camera, size, s);
      if (jobs.length > 0 && overlapsQueued(s)) {
        if (shadows) ctx.shadowColor = "transparent";
        drawText(jobs, z, zooming);
        queued.clear();
      }
      if (shadows) ctx.shadowColor = SHADOW_COLOUR;
      ctx.fillStyle = STICKY.fill;
      ctx.fillRect(p.x, p.y, s.w * z, s.h * z);
      if (shadows) ctx.shadowColor = "transparent";

      // The text overlay shows the text of the sticky being edited.
      if (showText && s.text !== "" && s.id !== editingId) {
        jobs.push({ s, p, layout: layoutOf(s) });
        someCell(s, (key) => {
          const list = queued.get(key);
          if (list) list.push(s);
          else queued.set(key, [s]);
          return false;
        });
      }
    }
    ctx.shadowColor = "transparent";
    drawText(jobs, z, zooming);

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
      metrics = null;
      widths.clear();
      schedule();
    },
    destroy() {
      destroyed = true;
      off();
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settle);
      frame = 0;
    },
  };
}
