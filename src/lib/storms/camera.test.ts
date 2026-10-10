import { describe, expect, it } from "vitest";
import {
  HOME_CAMERA,
  MAX_ZOOM,
  MIN_ZOOM,
  boardToScreen,
  fitCamera,
  panBy,
  screenToBoard,
  stepZoom,
  visibleRect,
  zoomAt,
} from "./camera";

const vp = { w: 800, h: 600 };

describe("camera", () => {
  it("round-trips board and screen", () => {
    const cam = { x: 120, y: -40, zoom: 2 };
    const p = boardToScreen(cam, vp, { x: 10, y: 20 });
    const b = screenToBoard(cam, vp, p);
    expect(b.x).toBeCloseTo(10, 9);
    expect(b.y).toBeCloseTo(20, 9);
    expect(boardToScreen(cam, vp, { x: 120, y: -40 })).toEqual({ x: 400, y: 300 });
  });

  it("zoomAt keeps the board point under the cursor", () => {
    const cam = { x: 50, y: 70, zoom: 1 };
    const s = { x: 123, y: 456 };
    const before = screenToBoard(cam, vp, s);
    const next = zoomAt(cam, vp, s, 2.5);
    const after = screenToBoard(next, vp, s);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
    expect(next.zoom).toBe(2.5);
  });

  it("zoomAt clamps to 0.1 and 4", () => {
    expect(zoomAt(HOME_CAMERA, vp, { x: 0, y: 0 }, 100).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(HOME_CAMERA, vp, { x: 0, y: 0 }, 0.001).zoom).toBe(MIN_ZOOM);
  });

  it("stepZoom from 1 -> 1.5; from 4 stays 4; from 0.3 down -> 0.25", () => {
    expect(stepZoom(HOME_CAMERA, vp, 1).zoom).toBe(1.5);
    expect(stepZoom({ x: 0, y: 0, zoom: 1.5 }, vp, 1).zoom).toBe(2);
    expect(stepZoom({ x: 0, y: 0, zoom: 4 }, vp, 1).zoom).toBe(4);
    expect(stepZoom({ x: 0, y: 0, zoom: 0.3 }, vp, -1).zoom).toBe(0.25);
    expect(stepZoom({ x: 0, y: 0, zoom: 0.1 }, vp, -1).zoom).toBe(0.1);
  });

  it("fitCamera contains all bounds inside the viewport minus margin", () => {
    const bounds = { x: 100, y: 200, w: 2000, h: 1000 };
    const cam = fitCamera(bounds, vp, 64);
    const tl = boardToScreen(cam, vp, { x: bounds.x, y: bounds.y });
    const br = boardToScreen(cam, vp, { x: bounds.x + bounds.w, y: bounds.y + bounds.h });
    expect(tl.x).toBeGreaterThanOrEqual(64 - 1e-9);
    expect(tl.y).toBeGreaterThanOrEqual(64 - 1e-9);
    expect(br.x).toBeLessThanOrEqual(vp.w - 64 + 1e-9);
    expect(br.y).toBeLessThanOrEqual(vp.h - 64 + 1e-9);
    expect(cam.x).toBe(1100);
    expect(cam.y).toBe(700);
  });

  it("fitCamera(null) -> HOME_CAMERA", () => {
    expect(fitCamera(null, vp)).toEqual(HOME_CAMERA);
  });

  it("fitCamera respects MAX_ZOOM for a tiny item", () => {
    expect(fitCamera({ x: 0, y: 0, w: 1, h: 1 }, vp).zoom).toBe(MAX_ZOOM);
  });

  it("panBy moves the centre opposite to the drag and clamps at +/-1_000_000", () => {
    const c = panBy({ x: 0, y: 0, zoom: 2 }, 100, -50);
    expect(c.x).toBe(-50);
    expect(c.y).toBe(25);
    expect(panBy({ x: 999_999, y: -999_999, zoom: 1 }, -100, 100)).toMatchObject({
      x: 1_000_000,
      y: -1_000_000,
    });
  });

  it("visibleRect covers the viewport in board units", () => {
    expect(visibleRect({ x: 0, y: 0, zoom: 2 }, vp)).toEqual({ x: -200, y: -150, w: 400, h: 300 });
  });
});
