"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { Editor } from "@tiptap/core";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  clampOffset,
  clampScale,
  maxScale,
  noteImagesIn,
  swipeDirection,
  TAP_SLOP_PX,
  zoomAround,
  type LightboxImage,
  type Point,
  type Size,
  type View,
} from "@/lib/notes/lightbox";
import { cn } from "@/lib/utils";
import { downloadAttachment } from "./file-card-view";
import { useAttachmentStore } from "./store";

const LightboxContext = createContext<(attachmentId: string) => void>(() => {});

/** Opens the image viewer on one of the note's images (image-lightbox D1). */
export const useLightbox = () => useContext(LightboxContext);

/**
 * Provides `useLightbox()` to the note and renders the one viewer. The list of
 * images is read from the note when the viewer opens, keeping uploaded ones.
 */
export function LightboxProvider({ editor, children }: { editor: Editor | null; children: React.ReactNode }) {
  const store = useAttachmentStore();
  const [shown, setShown] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const open = useCallback(
    (id: string) => {
      if (!editor) return;
      const images = noteImagesIn(editor.state.doc).filter((i) => store.status(i.id, null).kind === "ready");
      const index = images.findIndex((i) => i.id === id);
      if (index >= 0) setShown({ images, index });
    },
    [editor, store],
  );

  return (
    <LightboxContext value={open}>
      {children}
      <DialogPrimitive.Root open={!!shown} onOpenChange={(o) => !o && setShown(null)}>
        <DialogPrimitive.Portal>
          {shown && (
            <Viewer
              images={shown.images}
              index={shown.index}
              onIndex={(index) => setShown((s) => s && { ...s, index })}
              onClose={() => setShown(null)}
            />
          )}
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </LightboxContext>
  );
}

const arrowClass =
  "absolute top-1/2 -translate-y-1/2 bg-warm-50/80 shadow-sm ring-1 ring-warm-200 dark:bg-warm-900/70 dark:ring-0 pointer-coarse:size-11";

const FITTED: View = { scale: 1, offset: { x: 0, y: 0 } };

const iconButton =
  "flex size-10 items-center justify-center rounded-full text-warm-800 hover:bg-warm-800/10 dark:text-warm-50 dark:hover:bg-warm-50/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 pointer-coarse:size-11";

/** The full-screen viewer (image-lightbox D2, D4, D5, D6). It is its own backdrop: light in the light theme, dark in the dark one. */
function Viewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const store = useAttachmentStore();
  const image = images[index];
  const status = store.status(image.id, null);
  const url = status.kind === "ready" ? status.url : null;
  const several = images.length > 1;
  const closeRef = useRef<HTMLButtonElement>(null);

  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Size | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [view, setView] = useState<View>(FITTED);

  const step = (by: -1 | 1) => {
    const next = index + by;
    if (next < 0 || next >= images.length) return;
    setNatural(null);
    setView(FITTED);
    onIndex(next);
  };

  // ← → browse wherever focus is in the viewer, even after a click on the image (D5).
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
      e.preventDefault();
      stepRef.current(e.key === "ArrowRight" ? 1 : -1);
    };
    // Capture phase: the dialog stops key events from bubbling past it.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fitted: the whole image in the area, never larger than its own size.
  const fit = natural && area ? Math.min(1, area.w / natural.w, area.h / natural.h) : null;
  const fitted: Size | null = natural && fit ? { w: natural.w * fit, h: natural.h * fit } : null;
  const actual = fit ? 1 / fit : 1;
  const max = maxScale(actual);

  const settle = (v: View): View => {
    if (!fitted || !area || v.scale <= 1.01) return FITTED;
    return { scale: v.scale, offset: clampOffset(v.offset, v.scale, fitted, area) };
  };

  // Gestures (D4, D5): pointers on the area; one finger taps, swipes or drags,
  // two fingers pinch.
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    view: View;
    /** Whether the press began on the image (pointerup is retargeted to the area once captured). */
    onImage: boolean;
    multi: boolean;
    moved: boolean;
    pinch?: { dist: number; mid: Point; view: View };
  } | null>(null);

  const fromCentre = (p: Point): Point => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: p.x - (r.left + r.width / 2), y: p.y - (r.top + r.height / 2) };
  };
  const pinchOf = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: fromCentre({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    areaRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { start: { x: e.clientX, y: e.clientY }, view, onImage: e.target instanceof HTMLImageElement, multi: false, moved: false };
    } else if (pointers.current.size === 2 && gesture.current) {
      gesture.current.multi = true;
      gesture.current.pinch = { ...pinchOf(), view };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pinch && pointers.current.size >= 2) {
      const now = pinchOf();
      const scale = clampScale((g.pinch.view.scale * now.dist) / g.pinch.dist, max);
      const zoomed = zoomAround(g.pinch.view, scale, g.pinch.mid);
      const moved = {
        scale,
        offset: { x: zoomed.offset.x + now.mid.x - g.pinch.mid.x, y: zoomed.offset.y + now.mid.y - g.pinch.mid.y },
      };
      if (fitted && area) setView({ scale, offset: clampOffset(moved.offset, scale, fitted, area) });
      return;
    }
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (Math.hypot(dx, dy) > TAP_SLOP_PX) g.moved = true;
    if (g.view.scale > 1 && fitted && area) {
      const offset = { x: g.view.offset.x + dx, y: g.view.offset.y + dy };
      setView({ scale: g.view.scale, offset: clampOffset(offset, g.view.scale, fitted, area) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!pointers.current.delete(e.pointerId) || !g) return;
    if (g.multi) {
      if (pointers.current.size === 1) {
        // One finger left after a pinch: carry on dragging from where it is.
        const [p] = [...pointers.current.values()];
        setView((v) => {
          const s = settle(v);
          gesture.current = { start: p, view: s, onImage: false, multi: true, moved: true };
          return s;
        });
      } else if (pointers.current.size === 0) {
        setView((v) => settle(v));
        gesture.current = null;
      }
      return;
    }
    gesture.current = null;
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (!g.moved) {
      if (g.onImage) {
        // A tap on the image switches between fitted and actual size.
        if (actual > 1) setView(settle(view.scale > 1 ? FITTED : zoomAround(view, actual, fromCentre({ x: e.clientX, y: e.clientY }))));
      } else onClose();
      return;
    }
    if (g.view.scale === 1) {
      const dir = swipeDirection(dx, dy);
      if (dir) step(dir === "next" ? 1 : -1);
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setView((v) => settle(v));
    }
  };

  // The arrows sit 12px outside the fitted image, never closer than 8px to the
  // screen edge (both bars are centred on the same middle as the image).
  const arrowSide = fitted ? { left: `max(0.5rem, calc(50% - ${fitted.w / 2}px - 3.25rem))` } : undefined;

  // A click on the bars' empty space closes, like the dark area around the image.
  const closeOnSelf = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <DialogPrimitive.Popup
      initialFocus={closeRef}
      className="fixed inset-0 z-50 flex flex-col bg-warm-50/95 text-warm-800 backdrop-blur-md dark:bg-warm-950/95 dark:text-warm-50 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
    >
      <DialogPrimitive.Title className="sr-only">Image viewer</DialogPrimitive.Title>
      <div onClick={closeOnSelf} className="flex h-14 shrink-0 items-center justify-between gap-2 px-2 sm:px-4">
        {several ? (
          <span className="px-2 text-sm tabular-nums text-warm-600 dark:text-warm-200">
            <span aria-hidden>
              {index + 1} / {images.length}
            </span>
            <span className="sr-only" aria-live="polite">
              Image {index + 1} of {images.length}
            </span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1 pointer-coarse:gap-2">
          <button type="button" aria-label="Download" title="Download" className={iconButton} onClick={() => void downloadAttachment(image.id)}>
            <Download className="size-5" />
          </button>
          <DialogPrimitive.Close ref={closeRef} aria-label="Close" title="Close" className={iconButton}>
            <X className="size-5" />
          </DialogPrimitive.Close>
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={areaRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="absolute inset-0 touch-none overflow-hidden select-none sm:inset-x-16"
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URLs change per issue (attachments design D5)
            <img
              key={image.id}
              src={url}
              alt={image.alt ?? ""}
              draggable={false}
              ref={(img) => {
                if (img?.complete && img.naturalWidth && !natural) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => store.refresh(image.id)}
              style={
                fitted
                  ? {
                      width: fitted.w,
                      height: fitted.h,
                      transform: `translate(-50%, -50%) translate(${view.offset.x}px, ${view.offset.y}px) scale(${view.scale})`,
                    }
                  : { opacity: 0 }
              }
              className={cn(
                "absolute top-1/2 left-1/2 max-w-none",
                actual > 1 && (view.scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"),
              )}
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-warm-600 dark:text-warm-300">Loading…</p>
          )}
        </div>
        {several && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              title="Previous image"
              disabled={index === 0}
              onClick={() => step(-1)}
              style={arrowSide}
              className={cn(iconButton, arrowClass, "left-2")}
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              title="Next image"
              disabled={index === images.length - 1}
              onClick={() => step(1)}
              style={arrowSide && { right: arrowSide.left }}
              className={cn(iconButton, arrowClass, "right-2")}
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      <div onClick={closeOnSelf} className="flex min-h-12 shrink-0 items-center justify-center px-4 py-3">
        {image.alt && <p className="line-clamp-2 max-w-prose text-center text-sm text-warm-600 dark:text-warm-200">{image.alt}</p>}
      </div>
    </DialogPrimitive.Popup>
  );
}
