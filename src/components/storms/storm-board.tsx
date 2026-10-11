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
  /** No saving of any kind (board, undo history, view). Used by the dev speed gate. */
  readOnly?: boolean;
};

declare global {
  interface Window {
    /** Development only: lets the console seed and inspect the board. */
    __stormStore?: StormStore;
    /** Dev speed gate only: the store of a read-only synthetic board and its viewport. */
    __stormBench?: { store: StormStore; viewport: { w: number; h: number } };
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
  const { itemId, userId, readOnly = false, onStatus } = props;
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
    if (readOnly) {
      teardown = start(undefined, surface, box, canvas);
    } else {
      void withTimeout<History | null>(loadUndo(userId, itemId, initial.version), UNDO_LOAD_TIMEOUT_MS, null).then(
        (history) => {
          if (!cancelled) teardown = start(history ?? undefined, surface, box, canvas);
        },
      );
    }
    return () => {
      cancelled = true;
      teardown?.();
    };

    function start(history: History | undefined, surface: HTMLDivElement, box: HTMLDivElement, canvas: HTMLCanvasElement) {
    const store = createStormStore({
      body: initial.body,
      camera: (readOnly ? null : loadView(props.itemId)) ?? HOME_CAMERA,
      history,
    });
    setStore(store);
    if (process.env.NODE_ENV !== "production") window.__stormStore = store;
    if (readOnly && process.env.NODE_ENV !== "production") {
      window.__stormBench = {
        store,
        get viewport() {
          return getViewport();
        },
      };
    }

    // Remember the view 500 ms after the last camera change.
    let lastCamera = store.getSnapshot().camera;
    let pendingSave = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeView = store.subscribe(() => {
      if (readOnly) return;
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
      detachInput();
      unsubscribeView();
      clearTimeout(saveTimer);
      if (pendingSave) saveView(props.itemId, lastCamera);
      observer.disconnect();
      renderer.destroy();
      setStore(null);
      if (window.__stormStore === store) delete window.__stormStore;
      if (window.__stormBench?.store === store) delete window.__stormBench;
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
      {store && !readOnly && (
        <AutosaveHost store={store} itemId={itemId} userId={userId} version={initial.version} onStatus={onStatus} />
      )}
    </div>
  );
}

/** Saves the board and shows the conflict banner; kept apart so a read-only board needs no workspace. */
function AutosaveHost(props: {
  store: StormStore;
  itemId: string;
  userId: string;
  version: number;
  onStatus: (label: string) => void;
}) {
  const { store, itemId, userId, version, onStatus } = props;
  const autosave = useStormAutosave(store, itemId, version, {
    // Quiet after a save: keep the undo history for a reload at this version.
    onQuietSave: (v) => void saveUndo(userId, itemId, v, store.getHistoryForPersist()),
  });
  useEffect(() => onStatus(autosave.status), [onStatus, autosave.status]);
  return (
    <>
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
              <Button variant="outline" size="sm" disabled={autosave.resolving} onClick={() => void autosave.loadLatest()}>
                Load latest
              </Button>
              <Button size="sm" disabled={autosave.resolving} onClick={autosave.keepMine}>
                Keep mine
              </Button>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
