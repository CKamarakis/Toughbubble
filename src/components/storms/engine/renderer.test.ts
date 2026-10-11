import { afterEach, describe, expect, it, vi } from "vitest";
import { createStormStore } from "./store";
import { createRenderer } from "./renderer";
import type { StormBody } from "@/lib/storms/model";

afterEach(() => vi.unstubAllGlobals());

function fakeCanvas() {
  const fillTextFonts: string[] = [];
  const ctx = new Proxy(
    {
      font: "10px sans-serif",
      measureText: (s: string) => ({ width: s.length * 8, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 }),
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
  return { canvas, fillTextFonts };
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
