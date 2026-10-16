"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ColorGrid, type ColorGridHandle } from "./color-grid";
import type { StormStore } from "./engine/store";

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
  anchor,
  focusBoard,
}: {
  store: StormStore;
  /** The Sticky button: when it had focus as the tool turned on (a keyboard open), focus moves in. */
  anchor: React.RefObject<HTMLElement | null>;
  focusBoard: () => void;
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
    if (anchor.current && document.activeElement === anchor.current) gridRef.current?.focusCurrent();
  }, [anchor]);

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
      className="absolute bottom-full left-0 mb-2 animate-in rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-md duration-100 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
    >
      <ColorGrid
        ref={gridRef}
        label="Colour for new stickies"
        value={color}
        columns={2}
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
