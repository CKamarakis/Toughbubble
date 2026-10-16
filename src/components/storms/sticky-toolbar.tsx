"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { boardToScreen } from "@/lib/storms/camera";
import type { Rect, Size, Sticky } from "@/lib/storms/model";
import { colorOf, STICKY_COLORS } from "@/lib/storms/palette";
import { cn } from "cn";
import type { StormStore } from "./engine/store";
import { BoardTip, keepFocus } from "./storm-toolbar";

/** Screen px between the toolbar and the sticky (clear of the 5 px selection outline). */
const GAP = 8;
/** Screen px the toolbar and palette keep from the board's edges. */
const EDGE = 8;
/** Screen px between the toolbar and its palette. */
const PALETTE_GAP = 4;
const COLUMNS = 4;
/** Sizes used until the real ones are measured (and in tests, where nothing has a size). */
const TOOLBAR_SIZE: Size = { w: 42, h: 42 };
const PALETTE_SIZE: Size = { w: 178, h: 138 };

/** Keys the open palette takes from the board. */
const PALETTE_KEYS = new Set(["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "Enter", " "]);
/** Board shortcuts that must not act while the palette is open (lower case). */
const BOARD_KEYS = new Set(["delete", "backspace", "n"]);

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
export function StickyToolbar({ store, getViewport }: { store: StormStore; getViewport: () => Size }) {
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
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tb, setTb] = useState(TOOLBAR_SIZE);
  const [ps, setPs] = useState(PALETTE_SIZE);
  /** Open, and whether the keyboard opened it (then focus moves into the palette). */
  const [open, setOpen] = useState<null | { keyboard: boolean }>(null);
  const paletteId = useId();
  const current = colorOf(sticky);
  const currentIndex = STICKY_COLORS.indexOf(current);
  const [focusIndex, setFocusIndex] = useState(currentIndex);

  // Real sizes, once rendered; the fallbacks stand in before (and where layout gives none).
  useLayoutEffect(() => {
    const measure = (el: HTMLElement | null, now: Size, set: (s: Size) => void) => {
      if (!el?.offsetWidth || !el.offsetHeight) return;
      if (el.offsetWidth !== now.w || el.offsetHeight !== now.h) set({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure(barRef.current, tb, setTb);
    measure(paletteRef.current, ps, setPs);
  }, [open, tb, ps]);

  // Opened by the keyboard: focus the current colour.
  useEffect(() => {
    if (open?.keyboard) swatchRefs.current[currentIndex]?.focus();
    // Only when the palette opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      if (!inside && !e.ctrlKey && !e.metaKey && !e.altKey && PALETTE_KEYS.has(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        swatchRefs.current[currentIndex]?.focus({ preventScroll: true });
        paletteKey(e.key, currentIndex);
        return;
      }
      // Board shortcuts stay off while the palette is open.
      if (BOARD_KEYS.has(e.key.toLowerCase()) || ((e.ctrlKey || e.metaKey) && ["z", "y"].includes(e.key.toLowerCase()))) {
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
    setFocusIndex(currentIndex);
    setOpen({ keyboard });
  }
  function pick(hex: string) {
    store.setColor(sticky.id, hex);
    close();
  }
  function moveFocus(to: number) {
    const n = STICKY_COLORS.length;
    const i = ((to % n) + n) % n;
    setFocusIndex(i);
    swatchRefs.current[i]?.focus();
  }
  /** Acts on a palette key at swatch `i`; false when the key is not the palette's. */
  function paletteKey(key: string, i: number): boolean {
    const moves: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + COLUMNS,
      ArrowUp: i - COLUMNS,
      Home: 0,
      End: STICKY_COLORS.length - 1,
    };
    if (key in moves) {
      moveFocus(moves[key]);
      return true;
    }
    if (key === "Enter" || key === " ") {
      pick(STICKY_COLORS[i].hex);
      return true;
    }
    return false;
  }
  function onSwatchKey(e: React.KeyboardEvent, i: number) {
    if (paletteKey(e.key, i)) e.preventDefault();
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
          <div role="radiogroup" aria-label="Sticky colour" className="grid grid-cols-4 gap-2">
            {STICKY_COLORS.map((c, i) => {
              const checked = c.hex === current.hex;
              return (
                <button
                  key={c.id}
                  ref={(el) => {
                    swatchRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={c.name}
                  title={c.name}
                  tabIndex={i === focusIndex ? 0 : -1}
                  // Enter/Space pick on keydown (which stops the native click); this is a mouse click.
                  onClick={() => pick(c.hex)}
                  onKeyDown={(e) => onSwatchKey(e, i)}
                  onFocus={() => setFocusIndex(i)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border outline-none transition-transform duration-100 hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100",
                    c.hex === "#FFFFFF" ? "border-[#D9D8D3]" : "border-black/15",
                  )}
                  style={{ background: c.hex }}
                >
                  {checked && <Check aria-hidden className="size-4" strokeWidth={3} style={{ color: c.ink }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
