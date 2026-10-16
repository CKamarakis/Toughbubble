"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { boardToScreen } from "@/lib/storms/camera";
import type { Rect, Size, Sticky } from "@/lib/storms/model";
import { colorOf } from "@/lib/storms/palette";
import { ColorGrid, GRID_KEYS, type ColorGridHandle } from "./color-grid";
import type { StormStore } from "./engine/store";
import { BoardTip, keepFocus } from "./storm-toolbar";

/** Screen px between the toolbar and the sticky (clear of the 5 px selection outline). */
const GAP = 8;
/** Screen px the toolbar and palette keep from the board's edges. */
const EDGE = 8;
/** Screen px between the toolbar and its palette. */
const PALETTE_GAP = 4;
/** Sizes used until the real ones are measured (and in tests, where nothing has a size). */
const TOOLBAR_SIZE: Size = { w: 42, h: 42 };
const PALETTE_SIZE: Size = { w: 178, h: 178 };

/** Board shortcuts that must not act while the palette is open (lower case). */
const BOARD_KEYS = new Set(["delete", "backspace", "n"]);
/** With Ctrl or ⌘: undo, redo, duplicate, and copy and paste (a prevented keydown fires no copy or paste event). */
const MOD_BOARD_KEYS = new Set(["z", "y", "d", "c", "v"]);

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export type ToolbarPlace = { left: number; top: number; side: "above" | "below" };

/**
 * Where the toolbar goes for a sticky at screen rect `r`: centred `GAP` above it, or
 * below when that would leave the top of the board, kept inside the board horizontally
 * (and vertically, for a sticky taller than the board). Null when the sticky is out of view.
 */
export function placeToolbar(r: Rect, tb: Size, vp: Size): ToolbarPlace | null {
  if (r.x + r.w < 0 || r.x > vp.w || r.y + r.h < 0 || r.y > vp.h) return null;
  const left = clamp(r.x + r.w / 2 - tb.w / 2, EDGE, vp.w - tb.w - EDGE);
  const above = r.y - GAP - tb.h;
  if (above >= EDGE) return { left, top: above, side: "above" };
  return { left, top: clamp(r.y + r.h + GAP, EDGE, vp.h - tb.h - EDGE), side: "below" };
}

/**
 * Where the palette goes, relative to the board: on the sticky's side of the toolbar
 * (below a toolbar above the sticky, as Miro does), or the other side when that leaves
 * the board; centred on the toolbar and kept inside the board horizontally.
 */
export function placePalette(at: ToolbarPlace, tb: Size, p: Size, vp: Size): { left: number; top: number } {
  const below = at.top + tb.h + PALETTE_GAP;
  const above = at.top - PALETTE_GAP - p.h;
  const fitsBelow = below + p.h <= vp.h - EDGE;
  const fitsAbove = above >= EDGE;
  const top = at.side === "above" ? (fitsBelow || !fitsAbove ? below : above) : fitsAbove || !fitsBelow ? above : below;
  return { left: clamp(at.left + tb.w / 2 - p.w / 2, EDGE, vp.w - p.w - EDGE), top };
}

/**
 * The toolbar over the selected sticky: shown when exactly one sticky is selected and it
 * is not being edited or dragged and the board is not being panned. It follows the
 * sticky as the board pans and zooms.
 */
export function StickyToolbar({
  store,
  getViewport,
}: {
  store: StormStore;
  getViewport: () => Size;
  /** The board's size; a change re-renders the toolbar so it follows a resize. */
  size?: Size;
}) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const item = snap.selectedId ? snap.items[snap.selectedId] : undefined;
  if (!item || item.type !== "sticky" || snap.editingId !== null || snap.dragPreview || snap.panning) return null;
  const vp = getViewport();
  const p = boardToScreen(snap.camera, vp, item);
  const z = snap.camera.zoom;
  // A new sticky gets a closed palette.
  return <Bar key={item.id} store={store} sticky={item} rect={{ x: p.x, y: p.y, w: item.w * z, h: item.h * z }} vp={vp} />;
}

function Bar({ store, sticky, rect, vp }: { store: StormStore; sticky: Sticky; rect: Rect; vp: Size }) {
  const barRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<ColorGridHandle>(null);
  const [tb, setTb] = useState(TOOLBAR_SIZE);
  const [ps, setPs] = useState(PALETTE_SIZE);
  /** Open, and whether the keyboard opened it (then focus moves into the palette). */
  const [open, setOpen] = useState<null | { keyboard: boolean }>(null);
  const paletteId = useId();
  const current = colorOf(sticky);

  // Real sizes, once rendered; the fallbacks stand in before (and where layout gives none).
  useLayoutEffect(() => {
    const measure = (el: HTMLElement | null, now: Size, set: (s: Size) => void) => {
      if (!el?.offsetWidth || !el.offsetHeight) return;
      if (el.offsetWidth !== now.w || el.offsetHeight !== now.h) set({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure(barRef.current, tb, setTb);
    measure(paletteRef.current, ps, setPs);
  }, [open, tb, ps]);

  // Esc closes from anywhere (a palette opened with the mouse leaves focus on the board);
  // a press outside the toolbar closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const inside = barRef.current?.parentElement?.contains(e.target as Node);
      // The palette's own keys, pressed while focus is still on the board (a mouse open):
      // move focus to the current colour and act from there.
      if (!inside && !e.ctrlKey && !e.metaKey && !e.altKey && GRID_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        gridRef.current?.key(e.key);
        return;
      }
      // Board shortcuts stay off while the palette is open.
      if (BOARD_KEYS.has(e.key.toLowerCase()) || ((e.ctrlKey || e.metaKey) && MOD_BOARD_KEYS.has(e.key.toLowerCase()))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!barRef.current?.parentElement?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
    // Handlers read the current sticky through the closure; the Bar is keyed per sticky.
  }, [open]);

  const place = placeToolbar(rect, tb, vp);
  if (!place) return null;
  const palette = placePalette(place, tb, ps, vp);

  /** Closes the palette; focus inside it goes back to the Colour button. */
  function close() {
    const inside = paletteRef.current?.contains(document.activeElement);
    setOpen(null);
    if (inside) buttonRef.current?.focus();
  }
  function openPalette(keyboard: boolean) {
    setOpen({ keyboard });
  }
  function pick(hex: string) {
    store.setColor(sticky.id, hex);
    close();
  }

  return (
    // Presses here don't reach the board (no deselect, no pan) and keep focus where it is;
    // the wheel still bubbles to the board's surface, which zooms.
    <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={keepFocus} className="contents">
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Sticky tools"
        data-side={place.side}
        className="absolute flex items-center rounded-xl border border-border bg-card p-1 shadow-md"
        style={{ left: place.left, top: place.top }}
      >
        <BoardTip label="Colour">
          <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            aria-label={`Colour: ${current.name}`}
            aria-haspopup="dialog"
            aria-expanded={open !== null}
            aria-controls={open ? paletteId : undefined}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " " && e.key !== "ArrowDown") return;
              e.preventDefault();
              if (open) close();
              else openPalette(true);
            }}
            // A mouse click leaves focus on the board; a click from assistive tech (detail 0) moves it in.
            onClick={(e) => (open ? setOpen(null) : openPalette(e.detail === 0))}
          >
            <span
              aria-hidden
              className="size-5 rounded-full border border-black/15"
              style={{ background: current.hex, borderColor: current.hex === "#FFFFFF" ? "#D9D8D3" : undefined }}
            />
          </Button>
        </BoardTip>
      </div>
      {open && (
        <div
          ref={paletteRef}
          id={paletteId}
          role="dialog"
          aria-label="Colour palette"
          className="absolute animate-in rounded-[10px] border border-border bg-popover p-3 text-popover-foreground shadow-md duration-100 fade-in-0 zoom-in-95 motion-reduce:animate-none"
          style={{ left: palette.left, top: palette.top }}
          onBlur={(e) => {
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) setOpen(null);
          }}
        >
          {/* Esc is handled by the document listener above (from the board or the palette). */}
          <ColorGrid ref={gridRef} label="Sticky colour" value={current.hex} columns={4} autoFocus={open.keyboard} onPick={pick} />
        </div>
      )}
    </div>
  );
}
