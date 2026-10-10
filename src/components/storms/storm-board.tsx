"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { StormBody } from "@/lib/storms/model";
import { resolveFontFamily, waitForFont } from "./engine/font";
import { attachInput } from "./engine/input";
import { createRenderer } from "./engine/renderer";
import { createStormStore, type StormStore } from "./engine/store";
import { StormToolbar } from "./storm-toolbar";
import { loadView, saveView } from "./view-store";
import { ZoomControl } from "./zoom-control";

const VIEW_SAVE_DELAY_MS = 500;

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

/** The board surface: one canvas drawn by the renderer, with the toolbar and zoom control on top. */
export default function StormBoard(props: StormBoardProps) {
  const { initial } = props;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [store, setStore] = useState<StormStore | null>(null);
  const getViewport = useCallback(() => {
    const r = boxRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 0, h: r?.height ?? 0 };
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    const store = createStormStore({
      body: initial.body,
      camera: loadView(props.itemId) ?? HOME_CAMERA,
    });
    setStore(store);
    if (process.env.NODE_ENV !== "production") window.__stormStore = store;

    // Remember the view 500 ms after the last camera change.
    let lastCamera = store.getSnapshot().camera;
    let pendingSave = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeView = store.subscribe(() => {
      const { camera } = store.getSnapshot();
      if (camera === lastCamera) return;
      lastCamera = camera;
      pendingSave = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        pendingSave = false;
        saveView(props.itemId, camera);
      }, VIEW_SAVE_DELAY_MS);
    });

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

    const detachInput = attachInput(box, store, getViewport);

    return () => {
      alive = false;
      detachInput();
      unsubscribeView();
      clearTimeout(saveTimer);
      if (pendingSave) saveView(props.itemId, lastCamera);
      observer.disconnect();
      renderer.destroy();
      setStore(null);
      if (window.__stormStore === store) delete window.__stormStore;
    };
    // The store is created once per mount from the initial body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="light relative size-full overflow-hidden bg-background text-foreground">
      <div
        ref={boxRef}
        tabIndex={0}
        aria-label="Storm board"
        className="size-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <canvas ref={canvasRef} className="block size-full touch-none" />
      </div>
      {store && (
        <>
          <StormToolbar store={store} />
          <ZoomControl store={store} getViewport={getViewport} />
        </>
      )}
    </div>
  );
}
