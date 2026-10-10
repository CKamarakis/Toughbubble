import { boardToScreen, visibleRect } from "@/lib/storms/camera";
import { byZ, STICKY, type Item, type Size } from "@/lib/storms/model";
import { layoutSticky } from "@/lib/storms/text-layout";
import type { StormStore } from "./store";

const BACKGROUND = "#FFFFFF";
const DOT_COLOUR = "#D9D8D3";
const DOT_SPACING = 24;
const DOT_FULL_ZOOM = 0.5;
const DOT_NONE_ZOOM = 0.2;
const TEXT_MIN_ZOOM = 0.3;
const SHADOW_MIN_ZOOM = 0.3;
const SELECTION = { colour: "#F700A8", width: 2 };

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

  function schedule() {
    if (frame || destroyed) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      draw();
    });
  }

  function drawGrid(snap: ReturnType<StormStore["getSnapshot"]>) {
    if (!ctx) return;
    const { camera } = snap;
    const alpha = Math.min(1, Math.max(0, (camera.zoom - DOT_NONE_ZOOM) / (DOT_FULL_ZOOM - DOT_NONE_ZOOM)));
    if (alpha === 0) return;
    const v = visibleRect(camera, size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = DOT_COLOUR;
    const x0 = Math.floor(v.x / DOT_SPACING) * DOT_SPACING;
    const y0 = Math.floor(v.y / DOT_SPACING) * DOT_SPACING;
    for (let by = y0; by <= v.y + v.h; by += DOT_SPACING) {
      for (let bx = x0; bx <= v.x + v.w; bx += DOT_SPACING) {
        const p = boardToScreen(camera, size, { x: bx, y: by });
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!ctx || destroyed || size.w === 0 || size.h === 0) return;
    const snap = store.getSnapshot();
    const { camera, items, selectedId, dragPreview } = snap;
    const shift = (s: Item): Item =>
      dragPreview && dragPreview.id === s.id
        ? { ...s, x: s.x + dragPreview.dx, y: s.y + dragPreview.dy }
        : s;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size.w, size.h);
    drawGrid(snap);

    const v = visibleRect(camera, size);
    const visible = Object.values(items)
      .map(shift)
      .filter((s) => s.x < v.x + v.w && s.x + s.w > v.x && s.y < v.y + v.h && s.y + s.h > v.y)
      .sort(byZ);
    const shadows = camera.zoom >= SHADOW_MIN_ZOOM;
    const showText = fontReady && camera.zoom >= TEXT_MIN_ZOOM;
    const z = camera.zoom;

    for (const s of visible) {
      const p = boardToScreen(camera, size, s);
      ctx.save();
      if (shadows) {
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 8 * dpr;
        ctx.shadowOffsetY = 2 * dpr;
      }
      ctx.fillStyle = STICKY.fill;
      ctx.fillRect(p.x, p.y, s.w * z, s.h * z);
      ctx.restore();

      if (showText && s.text !== "") {
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.x, p.y, s.w * z, s.h * z);
        ctx.clip();
        ctx.translate(p.x, p.y);
        ctx.scale(z, z);
        ctx.font = font;
        ctx.fillStyle = STICKY.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const { lines, lineHeight, top } = layoutSticky(measure, s);
        lines.forEach((line, i) => {
          ctx.fillText(line, s.w / 2, top + (i + 0.5) * lineHeight);
        });
        ctx.restore();
      }
    }

    const found = selectedId ? items[selectedId] : undefined;
    const selected = found && shift(found);
    if (selected) {
      const p = boardToScreen(camera, size, selected);
      const w = SELECTION.width;
      ctx.strokeStyle = SELECTION.colour;
      ctx.lineWidth = w;
      ctx.strokeRect(p.x - w / 2, p.y - w / 2, selected.w * z + w, selected.h * z + w);
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
