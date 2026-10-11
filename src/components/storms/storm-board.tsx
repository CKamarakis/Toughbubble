"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HOME_CAMERA } from "@/lib/storms/camera";
import type { StormBody } from "@/lib/storms/model";
import { resolveFontFamily, waitForFont } from "./engine/font";
import { attachInput } from "./engine/input";
import { createRenderer } from "./engine/renderer";
import { createStormStore, type StormStore } from "./engine/store";
import { StickyTextOverlay } from "./sticky-text-overlay";
import type { History } from "@/lib/storms/history";
import { StormToolbar } from "./storm-toolbar";
import { loadUndo, saveUndo, withTimeout } from "./undo-store";
import { useStormAutosave } from "./use-storm-autosave";
import { loadView, saveView } from "./view-store";
import { ZoomControl } from "./zoom-control";

const VIEW_SAVE_DELAY_MS = 500;
/** How long the board waits for the saved undo history before starting without it. */
const UNDO_LOAD_TIMEOUT_MS = 300;

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
  const surfaceRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [store, setStore] = useState<StormStore | null>(null);
  const [family, setFamily] = useState("");
  const { itemId, userId } = props;
  const storeRef = useRef<StormStore | null>(null);
  const autosave = useStormAutosave(store, itemId, initial.version, {
    // Quiet after a save: keep the undo history for a reload at this version.
    onQuietSave: (version) => {
      if (storeRef.current) void saveUndo(userId, itemId, version, storeRef.current.getHistory());
    },
  });
  const { onStatus } = props;
  useEffect(() => onStatus(autosave.status), [onStatus, autosave.status]);
  const getViewport = useCallback(() => {
    const r = boxRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 0, h: r?.height ?? 0 };
  }, []);

  useEffect(() => {
    const surface = surfaceRef.current;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!surface || !box || !canvas) return;

    // The board stays blank until the saved undo history (kept only if it matches
    // this version) has been read, so it never shows an empty history and swaps.
    let cancelled = false;
    let teardown: (() => void) | undefined;
    void withTimeout<History | null>(loadUndo(userId, itemId, initial.version), UNDO_LOAD_TIMEOUT_MS, null).then(
      (history) => {
        if (!cancelled) teardown = start(history ?? undefined, surface, box, canvas);
      },
    );
    return () => {
      cancelled = true;
      teardown?.();
    };

    function start(history: History | undefined, surface: HTMLDivElement, box: HTMLDivElement, canvas: HTMLCanvasElement) {
    const store = createStormStore({
      body: initial.body,
      camera: loadView(props.itemId) ?? HOME_CAMERA,
      history,
    });
    storeRef.current = store;
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
    setFamily(family);
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

    const detachInput = attachInput(box, store, getViewport, surface);

    return () => {
      alive = false;
      storeRef.current = null;
      detachInput();
      unsubscribeView();
      clearTimeout(saveTimer);
      if (pendingSave) saveView(props.itemId, lastCamera);
      observer.disconnect();
      renderer.destroy();
      setStore(null);
      if (window.__stormStore === store) delete window.__stormStore;
    };
    }
    // The store is created once per mount from the initial body.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={surfaceRef}
      className="light relative size-full overflow-hidden bg-background text-foreground"
    >
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
          <StickyTextOverlay
            store={store}
            family={family}
            getViewport={getViewport}
            onExit={() => boxRef.current?.focus({ preventScroll: true })}
          />
          <StormToolbar store={store} />
          <ZoomControl store={store} getViewport={getViewport} />
        </>
      )}
      {autosave.state.phase === "conflict" && (
        <div className="absolute inset-x-4 top-4 mx-auto max-w-2xl rounded-lg bg-card shadow-md">
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-foreground"
          >
            <span>
              <strong>This storm was changed in another tab or device.</strong> Saving is paused until you choose.
            </span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void autosave.loadLatest()}>
                Load latest
              </Button>
              <Button size="sm" onClick={autosave.keepMine}>
                Keep mine
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
