import { afterEach, describe, expect, it, vi } from "vitest";
import { createStormStore } from "./store";
import { createRenderer } from "./renderer";
import type { StormBody } from "@/lib/storms/model";

afterEach(() => vi.unstubAllGlobals());

function fakeCanvas() {
  const fillTextFonts: string[] = [];
  const fillRects: { style: unknown; args: number[] }[] = [];
  /** Path and fill calls other than fillRect/strokeRect: where a grid would show up. */
  const pathCalls: string[] = [];
  const strokeRects: { style: unknown; width: unknown; args: number[] }[] = [];
  const ctx = new Proxy(
    {
      font: "10px sans-serif",
      measureText: (s: string) => ({ width: s.length * 8, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 }),
      fillRect: (...args: number[]) => {
        fillRects.push({ style: ctx.fillStyle, args });
      },
      strokeRect: (...args: number[]) => {
        strokeRects.push({ style: ctx.strokeStyle, width: ctx.lineWidth, args });
      },
      rect: () => void pathCalls.push("rect"),
      fill: () => void pathCalls.push("fill"),
      arc: () => void pathCalls.push("arc"),
      stroke: () => void pathCalls.push("stroke"),
      moveTo: () => void pathCalls.push("moveTo"),
      lineTo: () => void pathCalls.push("lineTo"),
      fillText: () => {
        fillTextFonts.push(ctx.font);
      },
    } as Record<string, unknown>,
    {
      get: (t, k: string) => (k in t ? t[k] : () => {}),
      set: (t, k: string, v) => {
        t[k] = v;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  const canvas = { getContext: () => ctx, width: 0, height: 0 } as unknown as HTMLCanvasElement;
  return { canvas, fillTextFonts, fillRects, strokeRects, pathCalls };
}

describe("createRenderer text font", () => {
  it("draws text at the screen font after a layout-cache miss, not the 20 px board font", () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const body: StormBody = {
      schema: 1,
      items: { a: { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "hello world" } },
    };
    const store = createStormStore({ body, camera: { x: 100, y: 100, zoom: 0.5 } });
    const { canvas, fillTextFonts } = fakeCanvas();
    const renderer = createRenderer(canvas, store, "Test");
    renderer.resize({ w: 400, h: 300 }, 1);
    renderer.setFontReady();
    frames.splice(0).forEach((f) => f());

    expect(fillTextFonts.length).toBeGreaterThan(0);
    expect(new Set(fillTextFonts)).toEqual(new Set(["10px Test"]));
  });
});

describe("createRenderer background", () => {
  it("fills a plain #F2F2F2 background with no grid dots at any zoom", () => {
    for (const zoom of [0.1, 1, 4]) {
      const frames: (() => void)[] = [];
      vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
      vi.stubGlobal("cancelAnimationFrame", () => {});
      const store = createStormStore({ body: { schema: 1, items: {} }, camera: { x: 0, y: 0, zoom } });
      const { canvas, fillRects, strokeRects, pathCalls } = fakeCanvas();
      const renderer = createRenderer(canvas, store, "Test");
      renderer.resize({ w: 400, h: 300 }, 1);
      frames.splice(0).forEach((f) => f());
      expect(fillRects.length).toBeGreaterThan(0);
      expect(fillRects.every((r) => r.style === "#F2F2F2")).toBe(true);
      expect(strokeRects).toEqual([]);
      expect(pathCalls).toEqual([]);
    }
  });
});

describe("createRenderer selection outline", () => {
  it("strokes a 1 px outline 5 screen px outside the sticky, at any zoom", () => {
    for (const zoom of [0.5, 1, 2]) {
      const frames: (() => void)[] = [];
      vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
      vi.stubGlobal("cancelAnimationFrame", () => {});
      const body: StormBody = {
        schema: 1,
        items: { a: { id: "a", type: "sticky", x: 0, y: 0, z: "a0", w: 200, h: 200, text: "" } },
      };
      const store = createStormStore({ body, camera: { x: 0, y: 0, zoom } });
      store.select("a");
      const { canvas, strokeRects } = fakeCanvas();
      const renderer = createRenderer(canvas, store, "Test");
      renderer.resize({ w: 400, h: 300 }, 1);
      frames.splice(0).forEach((f) => f());
      const left = 200; // board origin sits at the viewport centre
      const top = 150;
      expect(strokeRects.at(-1)).toEqual({
        style: "#F700A8",
        width: 1,
        args: [left - 5, top - 5, 200 * zoom + 10, 200 * zoom + 10],
      });
    }
  });
});
