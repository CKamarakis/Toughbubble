"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { boardToScreen, type Camera } from "@/lib/storms/camera";
import { MAX_TEXT } from "@/lib/storms/limits";
import { STICKY, type Size, type Sticky } from "@/lib/storms/model";
import { layoutSticky } from "@/lib/storms/text-layout";
import type { StormStore } from "./engine/store";

type Layout = { lineHeight: number; top: number; lines: number };

/**
 * Screen px box for the textarea over `s`: the sticky's rect, with type, line height
 * and padding scaled by zoom. `paddingTop` is the canvas's first-line top, so lines sit
 * where the canvas draws them; the bottom `clipBottom` px (below the last line the
 * canvas draws) are hidden, so overflow is clipped where the canvas clips it.
 */
export function overlayBox(s: Sticky, camera: Camera, vp: Size, layout: Layout) {
  const z = camera.zoom;
  const p = boardToScreen(camera, vp, s);
  return {
    left: p.x,
    top: p.y,
    width: s.w * z,
    height: s.h * z,
    fontSize: STICKY.fontPx * z,
    lineHeight: layout.lineHeight * z,
    paddingTop: layout.top * z,
    paddingX: STICKY.padding * z,
    clipBottom: (s.h - layout.top - layout.lines * layout.lineHeight) * z,
  };
}

/** Measures in board px with the same font the renderer draws with. */
function createMeasure(font: string): (s: string) => number {
  const ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  return (s) => {
    if (!ctx) return 0;
    ctx.font = font;
    return ctx.measureText(s).width;
  };
}

/**
 * The text editor for the sticky being edited: a transparent `<textarea>` laid exactly
 * over the canvas sticky, so the text stays put when editing starts and ends. Each
 * keystroke commits the text; Esc, a press elsewhere, or blur finishes the edit.
 */
export function StickyTextOverlay(props: OverlayProps) {
  // Subscribes to the editing id only, so panning and zooming do not re-render it.
  const editingId = useSyncExternalStore(
    props.store.subscribe,
    () => props.store.getSnapshot().editingId,
    () => props.store.getSnapshot().editingId,
  );
  return editingId ? <StickyTextEditor {...props} /> : null;
}

type OverlayProps = {
  store: StormStore;
  family: string;
  getViewport: () => Size;
  /** Called after Esc finishes the edit; returns focus to the board. */
  onExit: () => void;
};

function StickyTextEditor({ store, family, getViewport, onExit }: OverlayProps) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const ref = useRef<HTMLTextAreaElement>(null);
  const font = `${STICKY.fontPx}px ${family || "sans-serif"}`;
  const measure = useMemo(() => createMeasure(font), [font]);
  const sticky = snap.editingId ? snap.items[snap.editingId] : undefined;
  const editingId = sticky?.id;

  // Focus the new session with the caret at the end.
  useEffect(() => {
    const ta = ref.current;
    if (!editingId || !ta) return;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.scrollTop = 0;
  }, [editingId]);

  // A press anywhere but the textarea finishes the edit, including on controls that keep focus.
  useEffect(() => {
    if (!editingId) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === ref.current) return;
      if (ref.current) ref.current.scrollTop = 0;
      store.endEdit();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [editingId, store]);

  if (!sticky) return null;
  const layout = layoutSticky(measure, sticky);
  const box = overlayBox(sticky, snap.camera, getViewport(), {
    lineHeight: layout.lineHeight,
    top: layout.top,
    lines: layout.lines.length,
  });

  return (
    <textarea
      ref={ref}
      aria-label="Sticky text"
      value={sticky.text}
      maxLength={MAX_TEXT}
      spellCheck
      // The editor starts at the top, so lines match the canvas. It is not pinned there:
      // the caret scrolls it, so text beyond the sticky's edge can be reached and edited.
      onChange={(e) => store.setText(sticky.id, e.target.value)}
      onBlur={(e) => {
        e.currentTarget.scrollTop = 0;
        store.endEdit();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
        e.preventDefault();
        e.currentTarget.scrollTop = 0; // the canvas draws from line 0
        store.endEdit();
        onExit();
      }}
      className="absolute m-0 resize-none overflow-hidden border-0 bg-transparent outline-none"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        boxSizing: "border-box",
        padding: `${box.paddingTop}px ${box.paddingX}px 0`,
        fontFamily: family || "sans-serif",
        fontSize: box.fontSize,
        lineHeight: `${box.lineHeight}px`,
        color: STICKY.text,
        textAlign: "center",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        // A mask, not clip-path: it hides overflow without shrinking the click area.
        maskImage: `linear-gradient(black, black calc(100% - ${box.clipBottom}px), transparent 0)`,
        boxShadow: "none",
      }}
    />
  );
}
