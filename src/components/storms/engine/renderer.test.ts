import { afterEach, describe, expect, it, vi } from "vitest";
import { createStormStore } from "./store";
import { createRenderer } from "./renderer";
import type { Sticky, StormBody } from "@/lib/storms/model";
import { fitFontSize, scaleMeasure } from "@/lib/storms/text-layout";

afterEach(() => vi.unstubAllGlobals());

function fakeCanvas() {
  const fillTextFonts: string[] = [];
  /** Every `ctx.font` assignment, and every fill call in order. */
  const fontSets: string[] = [];
  const ops: string[] = [];
  let measures = 0;
  const fillRects: { style: unknown; args: number[] }[] = [];
  /** Path and fill calls other than fillRect/strokeRect: where a grid would show up. */
  const pathCalls: string[] = [];
  const strokeRects: { style: unknown; width: unknown; args: number[] }[] = [];
  const ctx = new Proxy(
    {
      font: "10px sans-serif",
      measureText: (s: string) => {
        measures++;
        return { width: s.length * 8, fontBoundingBoxAscent: 16, fontBoundingBoxDescent: 4 };
      },
      fillRect: (...args: number[]) => {
        ops.push(`rect ${args[0]}`);
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
      fillText: (text: string) => {
        ops.push(`text ${text}`);
        fillTextFonts.push(ctx.font);
      },
    } as Record<string, unknown>,
    {
      get: (t, k: string) => (k in t ? t[k] : () => {}),
      set: (t, k: string, v) => {
        if (k === "font") fontSets.push(v);
        t[k] = v;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  const canvas = { getContext: () => ctx, width: 0, height: 0 } as unknown as HTMLCanvasElement;
  return { canvas, fillTextFonts, fillRects, strokeRects, pathCalls, fontSets, ops, measures: () => measures };
}

describe("createRenderer text font", () => {
  it("draws text at the screen font after a layout-cache miss, not the 100 px measuring font", () => {
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
    // "hello world" fits a 200 px sticky at 64 px; at 50% that is 32 screen px.
    expect(new Set(fillTextFonts)).toEqual(new Set(["32px Test"]));
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
        args: [left - 5.5, top - 5.5, 200 * zoom + 11, 200 * zoom + 11],
      });
    }
  });
});

describe("createRenderer fitted sizes", () => {
  const fakeMeasure = scaleMeasure((t) => t.length * 8);
  const sticky = (id: string, over: Partial<Sticky>): Sticky => ({
    id,
    type: "sticky",
    x: 0,
    y: 0,
    z: "a0",
    w: 200,
    h: 200,
    text: "",
    ...over,
  });

  function draw(items: Sticky[], zoom = 1) {
    const frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const body: StormBody = { schema: 1, items: Object.fromEntries(items.map((i) => [i.id, i])) };
    const store = createStormStore({ body, camera: { x: 500, y: 500, zoom } });
    const changes: unknown[] = [];
    store.onChange((cs) => changes.push(cs));
    const fake = fakeCanvas();
    const renderer = createRenderer(fake.canvas, store, "Test");
    renderer.resize({ w: 2000, h: 2000 }, 1);
    renderer.setFontReady();
    const frame = () => {
      frames.splice(0).forEach((f) => f());
    };
    frame();
    return { ...fake, store, changes, renderer, frame };
  }

  it("draws an unsized sticky at its fitted size without changing the store", () => {
    const text = "Talk to users first, then cut scope and keep the core. ".repeat(3);
    const size = fitFontSize(fakeMeasure, text, 200, 200);
    expect(size).toBeLessThan(64);
    const { fillTextFonts, store, changes } = draw([sticky("a", { text })]);
    expect(fillTextFonts.length).toBeGreaterThan(1);
    expect(new Set(fillTextFonts)).toEqual(new Set([`${size}px Test`]));
    expect(changes).toEqual([]);
    expect("fontSize" in store.getSnapshot().items.a).toBe(false);
  });

  it("draws a sized sticky at its stored size, scaled by zoom", () => {
    const { fillTextFonts } = draw([sticky("a", { text: "Hi", fontSize: 30 })], 2);
    expect(new Set(fillTextFonts)).toEqual(new Set(["60px Test"]));
  });

  it("groups text by size: ctx.font is set once per size in a frame", () => {
    const items = [10, 20, 30, 40, 50, 60].map((n, i) =>
      sticky(`s${i}`, { x: i * 240, z: `a${i}`, text: "Hi", fontSize: i % 2 ? 20 : 40 }),
    );
    const { fontSets, fillTextFonts, frame, store } = draw(items);
    expect(fillTextFonts).toHaveLength(6);
    // A later frame, with every layout cached, sets the font once per size.
    fontSets.length = 0;
    fillTextFonts.length = 0;
    store.markDirty();
    frame();
    expect(fillTextFonts).toHaveLength(6);
    expect([...fontSets].sort()).toEqual(["20px Test", "40px Test"]);
  });

  it("fits once: a later frame measures nothing", () => {
    const items = [0, 1, 2].map((i) => sticky(`s${i}`, { x: i * 240, z: `a${i}`, text: `Sticky number ${i}` }));
    const { measures, frame, store, fillTextFonts } = draw(items);
    const before = measures();
    expect(before).toBeGreaterThan(0);
    store.markDirty();
    frame();
    expect(measures()).toBe(before);
    expect(fillTextFonts.length).toBeGreaterThan(3);
  });

  it("keeps z order where stickies overlap: the upper sticky covers the lower one's text", () => {
    const { ops } = draw([
      sticky("a", { x: 0, z: "a0", text: "Lower", fontSize: 20 }),
      sticky("b", { x: 100, z: "a1", text: "Upper", fontSize: 40 }),
    ]);
    // The last frame, after the background.
    const order = ops.slice(ops.lastIndexOf("rect 0") + 1);
    expect(order).toEqual(["rect 500", "text Lower", "rect 600", "text Upper"]);
  });

  it("skips text below 30% zoom", () => {
    const { fillTextFonts } = draw([sticky("a", { text: "Hi" })], 0.25);
    expect(fillTextFonts).toEqual([]);
  });
});
