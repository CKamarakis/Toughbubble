"use client";

import { useEffect, useRef } from "react";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { StormBody } from "@/lib/storms/model";
import { resolveFontFamily, waitForFont } from "./engine/font";
import { attachInput } from "./engine/input";
import { createRenderer } from "./engine/renderer";
import { createStormStore, type StormStore } from "./engine/store";

export type StormBoardProps = {
  itemId: string;
  initial: { body: StormBody; version: number };
  userId: string;
  onStatus: (label: string) => void;
};

declare global {
  interface Window {
    /** Development only: lets the console seed and inspect the board. */
    __stormStore?: StormStore;
  }
}

/** The board surface: one canvas drawn by the renderer. */
export default function StormBoard(props: StormBoardProps) {
  const { initial } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    const store = createStormStore({ body: initial.body, camera: HOME_CAMERA });
    if (process.env.NODE_ENV !== "production") window.__stormStore = store;

    const family = resolveFontFamily(box);
    const renderer = createRenderer(canvas, store, family);
    let alive = true;
    void waitForFont(family).then(() => {
      if (alive) renderer.setFontReady();
    });

    const fit = () => {
      const r = box.getBoundingClientRect();
      renderer.resize({ w: r.width, h: r.height }, window.devicePixelRatio || 1);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    fit();

    const detachInput = attachInput(box, store, () => {
      const r = box.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });

    return () => {
      alive = false;
      detachInput();
      observer.disconnect();
      renderer.destroy();
      if (window.__stormStore === store) delete window.__stormStore;
    };
    // The store is created once per mount from the initial body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      aria-label="Storm board"
      className="light size-full bg-background text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <canvas ref={canvasRef} className="block size-full touch-none" />
    </div>
  );
}
