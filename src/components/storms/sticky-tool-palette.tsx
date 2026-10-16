"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "cn";
import { ColorGrid, type ColorGridHandle } from "./color-grid";
import type { StormStore } from "./engine/store";

/**
 * Board px the palette may not use: the toolbar's bottom offset (16), its height (42), the gap
 * above it (8) and an edge at the top (8).
 */
export const PALETTE_RESERVED = 74;
/** Palette heights: 7 rows of 2 and 4 rows of 4 (36 px swatches, 8 px gaps, 8 px padding, border). */
const TWO_COLUMN_HEIGHT = 7 * 36 + 6 * 8 + 16 + 2;
const FOUR_COLUMN_HEIGHT = 4 * 36 + 3 * 8 + 16 + 2;

/**
 * How the palette fits a board `boardHeight` px tall: 2 per row (like Miro) when that fits above
 * the toolbar, else 4 per row, else 4 per row capped to the room left and scrolling.
 * An unknown height (0, not measured yet) counts as tall.
 */
export function paletteFit(boardHeight: number | undefined): { columns: 2 | 4; maxHeight?: number } {
  if (!boardHeight) return { columns: 2 };
  const room = boardHeight - PALETTE_RESERVED;
  if (room >= TWO_COLUMN_HEIGHT) return { columns: 2 };
  if (room >= FOUR_COLUMN_HEIGHT) return { columns: 4 };
  return { columns: 4, maxHeight: Math.max(0, room) };
}

/** Keys the open palette takes from the board; the Sticky tool gives them no other use there. */
const FROM_BOARD_KEYS = new Set(["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]);

function isEditable(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}

/**
 * The colour for new stickies, picked before placing (design D8, like Miro): shown above the
 * Sticky button while the Sticky tool is on, so it closes when the tool turns off, after a
 * sticky is placed (that turns the tool off) and on Esc (which turns the tool off too).
 * Picking keeps the tool on and returns focus to the board, so the next click places.
 */
export function StickyToolPalette({
  store,
  openedByKeyboardRef,
  focusBoard,
  boardHeight,
}: {
  store: StormStore;
  /**
   * Set by the Sticky button's click when the keyboard (or assistive tech) turned the tool on:
   * focus then moves into the palette. Read and cleared when the palette appears.
   */
  openedByKeyboardRef: React.RefObject<boolean>;
  focusBoard: () => void;
  /** The board's height, to fit the palette above the toolbar. */
  boardHeight?: number;
}) {
  const color = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().creationColor,
    () => store.getSnapshot().creationColor,
  );
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<ColorGridHandle>(null);

  // Opened from the Sticky button with the keyboard: focus the marked colour.
  useEffect(() => {
    if (openedByKeyboardRef.current) gridRef.current?.focusCurrent();
    openedByKeyboardRef.current = false;
  }, [openedByKeyboardRef]);
  const fit = paletteFit(boardHeight);

  // Arrows, Home and End pressed on the board (a mouse or N open) move focus into the palette.
  // Bubble phase: an open sticky-toolbar palette takes them first (capture) and stops them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !FROM_BOARD_KEYS.has(e.key)) return;
      if (isEditable(e.target) || boxRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      gridRef.current?.key(e.key);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Colour for new stickies"
      // Presses here don't reach the board and keep focus where it is (on the board, for a mouse).
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "absolute bottom-full left-0 mb-2 animate-in rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-md duration-100 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none",
        fit.maxHeight !== undefined && "overflow-y-auto",
      )}
      style={fit.maxHeight !== undefined ? { maxHeight: fit.maxHeight } : undefined}
    >
      <ColorGrid
        ref={gridRef}
        label="Colour for new stickies"
        value={color}
        columns={fit.columns}
        shape="square"
        onPick={(hex) => {
          store.setCreationColor(hex);
          focusBoard();
        }}
        onEscape={() => {
          store.setTool("select");
          focusBoard();
        }}
      />
    </div>
  );
}
