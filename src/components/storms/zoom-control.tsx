"use client";

import { Maximize, Minus, Plus } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { fitCamera, HOME_CAMERA, stepZoom, zoomAt } from "@/lib/storms/camera";
import { boundsOf, type Size } from "@/lib/storms/model";
import type { StormStore } from "./engine/store";
import { BoardTip } from "./storm-toolbar";

/** Bottom-right zoom control: out, percentage (resets to 100%), in, fit to items. */
export function ZoomControl({ store, getViewport }: { store: StormStore; getViewport: () => Size }) {
  const { camera } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const step = (dir: 1 | -1) => store.setCamera(stepZoom(store.getSnapshot().camera, getViewport(), dir));
  const reset = () => {
    const vp = getViewport();
    store.setCamera(zoomAt(store.getSnapshot().camera, vp, { x: vp.w / 2, y: vp.h / 2 }, 1));
  };
  const fit = () => {
    const items = Object.values(store.getSnapshot().items);
    store.setCamera(items.length ? fitCamera(boundsOf(items), getViewport()) : { ...HOME_CAMERA });
  };

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="absolute right-4 bottom-4 flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-md"
    >
      <BoardTip label="Zoom out">
        <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => step(-1)}>
          <Minus />
        </Button>
      </BoardTip>
      <BoardTip label="Reset zoom to 100%">
        <Button
          variant="ghost"
          aria-label="Reset zoom to 100%"
          className="min-w-12 tabular-nums"
          onClick={reset}
        >
          {Math.round(camera.zoom * 100)}%
        </Button>
      </BoardTip>
      <BoardTip label="Zoom in">
        <Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => step(1)}>
          <Plus />
        </Button>
      </BoardTip>
      <BoardTip label="Fit to items">
        <Button variant="ghost" size="icon" aria-label="Fit to items" onClick={fit}>
          <Maximize />
        </Button>
      </BoardTip>
    </div>
  );
}
