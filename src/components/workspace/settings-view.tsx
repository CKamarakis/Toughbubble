"use client";

import { RotateCcw } from "lucide-react";
import { createElement, useState } from "react";
import { ColorPicker } from "@/components/color-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/lib/notes/font-size";
import {
  BUILT_IN_SIZES,
  effectiveSize,
  ELEMENT_LABELS,
  STYLE_ELEMENTS,
  withElementStyle,
  type StyleElement,
} from "@/lib/settings/editor-styles";
import { useSettings } from "./settings-context";

const PREVIEW_TEXT: Record<StyleElement, string> = {
  p: "The quick brown fox jumps over the lazy dog.",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  h6: "Heading 6",
};

export function SettingsView() {
  const settings = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const anyChanged = Object.keys(settings.editorStyles).length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section aria-labelledby="editor-settings" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="editor-settings" className="text-lg font-semibold">
              Editor
            </h2>
            <p className="text-sm text-muted-foreground">
              Default size and color of text in your notes. Changes apply to every note and are saved
              automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={!anyChanged} onClick={() => setConfirmReset(true)}>
            <RotateCcw />
            Reset all
          </Button>
        </div>

        <ul className="overflow-hidden rounded-xl border" style={settings.editorVars}>
          {STYLE_ELEMENTS.map((el) => (
            <ElementRow key={el} element={el} />
          ))}
        </ul>
      </section>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all editor settings?</DialogTitle>
            <DialogDescription>
              Every element goes back to its built-in size and Automatic color. Your saved colors are
              kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={() => {
                settings.setEditorStyles({});
                setConfirmReset(false);
              }}
            >
              Reset all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ElementRow({ element }: { element: StyleElement }) {
  const settings = useSettings();
  const style = settings.editorStyles[element];
  const size = effectiveSize(settings.editorStyles, element);
  const label = ELEMENT_LABELS[element];
  // What's typed, even if invalid; the stored size only changes when valid.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(size);
  const parsed = Number(shown);
  const invalid = !Number.isInteger(parsed) || parsed < FONT_SIZE_MIN || parsed > FONT_SIZE_MAX;
  const inputId = `size-${element}`;

  return (
    <li className="flex flex-col gap-3 border-b px-4 py-3 last:border-b-0 md:flex-row md:items-center">
      <div className="tb-editor min-w-0 flex-1 overflow-hidden">
        {createElement(element, { className: "!m-0 truncate" }, PREVIEW_TEXT[element])}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-20 text-sm text-muted-foreground">{label}</span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={shown}
              aria-label={`${label} size in pixels`}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${inputId}-error` : undefined}
              onChange={(e) => {
                const text = e.target.value;
                setDraft(text);
                const n = Number(text);
                if (Number.isInteger(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX) {
                  settings.setEditorStyles(withElementStyle(settings.editorStyles, element, { size: n }));
                }
              }}
              onBlur={() => setDraft(null)}
              className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
            />
            <span className="text-sm text-muted-foreground">px</span>
          </div>
          {invalid && (
            <span id={`${inputId}-error`} role="alert" className="text-xs text-foreground">
              Use {FONT_SIZE_MIN}–{FONT_SIZE_MAX}
            </span>
          )}
        </div>
        <ColorPicker
          label={`${label} color`}
          value={style?.color ?? null}
          allowAutomatic
          onChange={(color) =>
            settings.setEditorStyles(withElementStyle(settings.editorStyles, element, { color: color ?? undefined }))
          }
          savedColors={settings.savedColors}
          onAddSavedColor={settings.addSavedColor}
          onRemoveSavedColor={settings.removeSavedColor}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={!style}
          aria-label={`Reset ${label}`}
          title={`Reset to ${BUILT_IN_SIZES[element]} px and Automatic color`}
          onClick={() => {
            setDraft(null);
            settings.setEditorStyles(withElementStyle(settings.editorStyles, element, { size: BUILT_IN_SIZES[element], color: undefined }));
          }}
        >
          Reset
        </Button>
      </div>
    </li>
  );
}
