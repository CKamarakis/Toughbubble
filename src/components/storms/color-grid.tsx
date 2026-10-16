"use client";

import { Check } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { STICKY_COLORS } from "@/lib/storms/palette";
import { cn } from "cn";

/** Keys a palette acts on; an open palette may take them from the board (see `ColorGridHandle.key`). */
export const GRID_KEYS = new Set(["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "Enter", " "]);

export type ColorGridHandle = {
  /** Moves focus to the marked colour. */
  focusCurrent(): void;
  /** Moves focus to the marked colour and acts on `key` from there; false when it is not a grid key. */
  key(key: string): boolean;
};

const COLUMN_CLASS = { 2: "grid-cols-2", 4: "grid-cols-4" } as const;

/**
 * The sticky presets as a radio group of labelled swatches with the current colour marked:
 * roving focus, arrows (by `columns` for up/down, wrapping), Home/End, Enter/Space pick,
 * Esc calls `onEscape`. Shared by the sticky toolbar's palette and the Sticky tool's palette.
 */
export function ColorGrid({
  ref,
  label,
  value,
  columns,
  shape = "round",
  autoFocus = false,
  onPick,
  onEscape,
}: {
  ref?: React.Ref<ColorGridHandle>;
  label: string;
  /** The marked colour's hex. */
  value: string;
  columns: 2 | 4;
  /** Round swatches (sticky toolbar) or sticky-shaped squares (Sticky tool, like Miro). */
  shape?: "round" | "square";
  /** Focus the marked colour when the grid appears (opened by the keyboard). */
  autoFocus?: boolean;
  onPick: (hex: string) => void;
  onEscape?: () => void;
}) {
  const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const currentIndex = Math.max(0, STICKY_COLORS.findIndex((c) => c.hex === value));
  const [focusIndex, setFocusIndex] = useState(currentIndex);

  useEffect(() => {
    if (autoFocus) swatchRefs.current[currentIndex]?.focus();
    // Only when the grid appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function moveFocus(to: number) {
    const n = STICKY_COLORS.length;
    const i = ((to % n) + n) % n;
    setFocusIndex(i);
    swatchRefs.current[i]?.focus();
  }

  /** Acts on a grid key at swatch `i`; false when the key is not the grid's. */
  function act(key: string, i: number): boolean {
    const moves: Record<string, number> = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + columns,
      ArrowUp: i - columns,
      Home: 0,
      End: STICKY_COLORS.length - 1,
    };
    if (key in moves) {
      moveFocus(moves[key]);
      return true;
    }
    if (key === "Enter" || key === " ") {
      onPick(STICKY_COLORS[i].hex);
      return true;
    }
    return false;
  }

  useImperativeHandle(ref, () => ({
    focusCurrent() {
      swatchRefs.current[currentIndex]?.focus({ preventScroll: true });
    },
    key(key) {
      if (!GRID_KEYS.has(key)) return false;
      swatchRefs.current[currentIndex]?.focus({ preventScroll: true });
      return act(key, currentIndex);
    },
  }));

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", COLUMN_CLASS[columns])}>
      {STICKY_COLORS.map((c, i) => {
        const checked = c.hex === value;
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
            onClick={() => onPick(c.hex)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && onEscape) {
                e.preventDefault();
                e.stopPropagation();
                onEscape();
              } else if (act(e.key, i)) e.preventDefault();
            }}
            onFocus={() => setFocusIndex(i)}
            className={cn(
              "flex items-center justify-center border outline-none transition-transform duration-100 hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100",
              shape === "round" ? "size-8 rounded-full" : "size-9 rounded-[4px]",
              c.hex === "#FFFFFF" ? "border-[#D9D8D3]" : "border-black/15",
            )}
            style={{ background: c.hex }}
          >
            {checked && <Check aria-hidden className="size-4" strokeWidth={3} style={{ color: c.ink }} />}
          </button>
        );
      })}
    </div>
  );
}
