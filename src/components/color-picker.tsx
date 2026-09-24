"use client";

import { AlertTriangle, Check, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hardToReadIn, parseHexColor, PAGE_BACKGROUNDS } from "@/lib/color";
import { NEEDS_OUTLINE, PRESET_COLORS } from "@/lib/color-presets";
import { cn } from "@/lib/utils";

// Shared color picker (design D10): the user's saved colors first, then nine
// presets in two rows of five with Automatic as the tenth slot where allowed,
// and "+" to add a custom color. Reused later by Storms.

type Swatch =
  | { kind: "saved"; hex: string }
  | { kind: "preset"; hex: string; name: string }
  | { kind: "auto" };

const COLUMNS = 5;

export type ColorPickerProps = {
  /** Selected color as #rrggbb, or null for Automatic. */
  value: string | null;
  onChange: (value: string | null) => void;
  savedColors: string[];
  onAddSavedColor: (hex: string) => void;
  onRemoveSavedColor: (hex: string) => void;
  allowAutomatic?: boolean;
  /** Backgrounds to check readability against; defaults to the page backgrounds. */
  contrastAgainst?: { light: string; dark: string };
  /** For a color used in one theme only: the warning checks just that theme. */
  theme?: "light" | "dark";
  /** Accessible name of the trigger, e.g. "Heading 1 color". */
  label: string;
};

export function ColorPicker({
  value,
  onChange,
  savedColors,
  onAddSavedColor,
  onRemoveSavedColor,
  allowAutomatic = false,
  contrastAgainst = PAGE_BACKGROUNDS,
  theme,
  label,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const current = value ? describe(value, savedColors) : "Automatic";
  const hardIn = value ? hardToReadIn(value, contrastAgainst, theme) : [];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAdding(false);
      }}
    >
      <PopoverTrigger
        aria-label={`${label}: ${current}`}
        className="flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-2 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <SwatchDot hex={value} />
        <span className="max-w-24 truncate">{current}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3 p-3">
        {adding ? (
          <CustomColor
            initial={value}
            onCancel={() => setAdding(false)}
            onAdd={(hex) => {
              onAddSavedColor(hex);
              onChange(hex);
              setAdding(false);
            }}
          />
        ) : (
          <SwatchGrid
            value={value}
            savedColors={savedColors}
            allowAutomatic={allowAutomatic}
            onPick={(next) => {
              onChange(next);
              setOpen(false);
            }}
            onRemove={onRemoveSavedColor}
            onAdd={() => setAdding(true)}
          />
        )}
        {hardIn.length > 0 && !adding && (
          <p role="status" className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning" />
            Hard to read in {hardIn.length === 2 ? "light and dark" : hardIn[0]} mode.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function describe(hex: string, savedColors: string[]) {
  const preset = PRESET_COLORS.find((p) => p.hex === hex);
  if (preset) return preset.name;
  return savedColors.includes(hex) ? `Custom ${hex}` : hex;
}

function SwatchDot({ hex, className }: { hex: string | null; className?: string }) {
  if (!hex) {
    // Automatic: half light, half dark, like the theme it follows.
    return (
      <span
        aria-hidden
        className={cn("size-4 shrink-0 rounded-full border border-input bg-[linear-gradient(135deg,#fbfbf9_50%,#333129_50%)]", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("size-4 shrink-0 rounded-full", NEEDS_OUTLINE.has(hex) && "border border-input", className)}
      style={{ backgroundColor: hex }}
    />
  );
}

function SwatchGrid({
  value,
  savedColors,
  allowAutomatic,
  onPick,
  onRemove,
  onAdd,
}: {
  value: string | null;
  savedColors: string[];
  allowAutomatic: boolean;
  onPick: (hex: string | null) => void;
  onRemove: (hex: string) => void;
  onAdd: () => void;
}) {
  const saved: Swatch[] = savedColors.map((hex) => ({ kind: "saved", hex }));
  const presets: Swatch[] = [
    ...PRESET_COLORS.map((p) => ({ kind: "preset" as const, hex: p.hex, name: p.name })),
    ...(allowAutomatic ? [{ kind: "auto" as const }] : []),
  ];
  // One roving focus order across both groups; rows are COLUMNS wide in each.
  const all = [...saved, ...presets];
  const selectedIndex = all.findIndex((s) => (s.kind === "auto" ? value === null : s.hex === value));
  const [focus, setFocus] = useState(Math.max(selectedIndex, 0));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const next = Math.max(0, Math.min(all.length - 1, to));
    setFocus(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const inSaved = index < saved.length;
    const groupStart = inSaved ? 0 : saved.length;
    const col = (index - groupStart) % COLUMNS;
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(index + 1),
      ArrowLeft: () => move(index - 1),
      ArrowDown: () => move(inSaved && index + COLUMNS >= saved.length ? saved.length + col : index + COLUMNS),
      ArrowUp: () => {
        if (!inSaved && index - COLUMNS < saved.length && saved.length > 0) {
          const lastRowStart = Math.floor((saved.length - 1) / COLUMNS) * COLUMNS;
          move(Math.min(lastRowStart + col, saved.length - 1));
        } else move(index - COLUMNS);
      },
      Home: () => move(0),
      End: () => move(all.length - 1),
      Delete: () => {
        const s = all[index];
        if (s.kind === "saved") {
          onRemove(s.hex);
          move(index === saved.length - 1 ? index - 1 : index);
        }
      },
    };
    keys.Backspace = keys.Delete;
    const handler = keys[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  const renderSwatch = (s: Swatch, index: number) => {
    const selected = index === selectedIndex;
    const name = s.kind === "auto" ? "Automatic" : s.kind === "preset" ? `${s.name} ${s.hex}` : `Custom ${s.hex}`;
    return (
      <div key={s.kind === "auto" ? "auto" : `${s.kind}-${s.hex}`} className="group/swatch relative">
        <button
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={name}
          title={name}
          tabIndex={index === focus ? 0 : -1}
          onClick={() => onPick(s.kind === "auto" ? null : s.hex)}
          onKeyDown={(e) => onKeyDown(e, index)}
          onFocus={() => setFocus(index)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            selected && "ring-2 ring-foreground",
          )}
        >
          <SwatchDot hex={s.kind === "auto" ? null : s.hex} className="size-7" />
          {selected && (
            <Check
              aria-hidden
              className={cn(
                "absolute size-3.5",
                s.kind !== "auto" && (NEEDS_OUTLINE.has(s.hex) || s.hex === "#6ea8ff") ? "text-[#141310]" : "text-white",
              )}
              strokeWidth={3}
            />
          )}
        </button>
        {s.kind === "saved" && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Remove saved color ${s.hex}`}
            onClick={() => onRemove(s.hex)}
            className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full bg-foreground text-background group-focus-within/swatch:flex group-hover/swatch:flex"
          >
            <X className="size-3" strokeWidth={3} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div role="radiogroup" aria-label="Colors" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">My colors</span>
        <div className="grid grid-cols-5 gap-1.5">
          {saved.map((s, i) => renderSwatch(s, i))}
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add a custom color"
            title="Add a custom color"
            className="flex size-9 items-center justify-center rounded-full border border-dashed border-input text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Colors</span>
        <div className="grid grid-cols-5 gap-1.5">{presets.map((s, i) => renderSwatch(s, saved.length + i))}</div>
      </div>
    </div>
  );
}

function CustomColor({
  initial,
  onAdd,
  onCancel,
}: {
  initial: string | null;
  onAdd: (hex: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial ?? "#");
  const parsed = parseHexColor(text);
  const invalid = text.length > 1 && !parsed;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed) onAdd(parsed);
      }}
    >
      <span className="text-xs font-medium text-muted-foreground">Custom color</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick a color"
          value={parsed ?? "#000000"}
          onChange={(e) => setText(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Hex code"
          aria-invalid={invalid || undefined}
          aria-describedby="custom-color-hint"
          placeholder="#1a7f5a"
          maxLength={7}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
        />
      </div>
      <p id="custom-color-hint" className="text-xs text-muted-foreground" role={invalid ? "alert" : undefined}>
        {invalid ? "Not a valid color. Use 6 hex digits, like #1a7f5a." : "Pick a color or type a hex code."}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!parsed}>
          Add color
        </Button>
      </div>
    </form>
  );
}
