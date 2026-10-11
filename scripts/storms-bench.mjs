// Storm speed gate (design D11): opens the dev-only synthetic 1,000-sticky board,
// throttles the CPU 4x, drives the camera per frame and fails below the bar.
// Needs a dev server: BENCH_URL (default http://localhost:3101) -> `npx next dev -p 3101`.
import { chromium } from "playwright";

const BASE = process.env.BENCH_URL ?? "http://localhost:3101";
const URL_ = `${BASE.replace(/\/$/, "")}/dev/storm-bench?items=${process.env.BENCH_ITEMS ?? 1000}`;
const PHASE_MS = 5000;
const MIN_MEDIAN_FPS = 50;
const MAX_P95_MS = 33;

// The bundled headless Chromium rasterises the canvas in software unless told otherwise,
// which says nothing about a real browser. Like the spike, the GPU is not throttled; only the CPU is.
const browser = await chromium.launch({
  channel: process.env.BENCH_CHANNEL || undefined,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=d3d11"],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(URL_, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__stormBench), null, { timeout: 120_000 });
  // Let the first draw, font load and layout settle.
  await page.waitForTimeout(1500);

  const results = await page.evaluate(async (phaseMs) => {
    const { store, viewport } = window.__stormBench;
    const items = Object.values(store.getSnapshot().items);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of items) {
      minX = Math.min(minX, s.x); minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.w); maxY = Math.max(maxY, s.y + s.h);
    }
    const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const margin = 64;
    const fitZoom = Math.min(
      (viewport.w - 2 * margin) / (maxX - minX),
      (viewport.h - 2 * margin) / (maxY - minY),
    );
    const fit = { x: centre.x, y: centre.y, zoom: Math.max(0.1, Math.min(4, fitZoom)) };

    const lerp = (a, b, t) => a + (b - a) * t;
    // Each phase maps progress t in [0,1] to a camera.
    const phases = {
      "pan at 100%": (t) => ({
        x: centre.x + 1500 * Math.sin(t * Math.PI * 4),
        y: centre.y + 900 * Math.sin(t * Math.PI * 2),
        zoom: 1,
      }),
      "zoom 100% > fit > 100%": (t) => {
        const k = 1 - Math.abs(2 * t - 1); // 0 -> 1 -> 0
        return {
          x: lerp(centre.x, fit.x, k),
          y: lerp(centre.y, fit.y, k),
          zoom: Math.exp(lerp(Math.log(1), Math.log(fit.zoom), k)),
        };
      },
      "pan at fit": (t) => ({
        x: fit.x + (300 / fit.zoom) * Math.sin(t * Math.PI * 4),
        y: fit.y + (200 / fit.zoom) * Math.sin(t * Math.PI * 2),
        zoom: fit.zoom,
      }),
    };

    const out = { fitZoom: fit.zoom, phases: {} };
    for (const [name, cameraAt] of Object.entries(phases)) {
      store.setCamera(cameraAt(0));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const frames = [];
      await new Promise((resolve) => {
        let start = 0;
        let last = 0;
        const tick = (now) => {
          if (!start) start = last = now;
          else {
            frames.push(now - last);
            last = now;
          }
          const t = (now - start) / phaseMs;
          if (t >= 1) return resolve();
          store.setCamera(cameraAt(t));
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      out.phases[name] = frames;
    }
    return out;
  }, PHASE_MS);

  const median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  const p95 = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)];
  };

  console.log(`Storm speed gate: ${URL_} (4x CPU throttle, 1440x900, fit zoom ${results.fitZoom.toFixed(3)})`);
  let failed = false;
  for (const [name, frames] of Object.entries(results.phases)) {
    const fps = 1000 / median(frames);
    const p = p95(frames);
    const ok = fps >= MIN_MEDIAN_FPS && p <= MAX_P95_MS;
    if (!ok) failed = true;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${name.padEnd(24)} median ${fps.toFixed(1)} fps, p95 ${p.toFixed(1)} ms (${frames.length} frames)`,
    );
  }
  console.log(failed ? `Below the bar (median >= ${MIN_MEDIAN_FPS} fps, p95 <= ${MAX_P95_MS} ms).` : "Speed gate passed.");
  process.exitCode = failed ? 1 : 0;
} finally {
  await browser.close();
}
