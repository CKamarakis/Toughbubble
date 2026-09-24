"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveEditorStyles, saveSavedColors } from "@/lib/settings/actions";
import {
  editorStyleVariables,
  withElementStyle,
  type EditorStyles,
  type ElementStyle,
  type StyleElement,
} from "@/lib/settings/editor-styles";
import type { UserSettings } from "@/lib/settings/operations";
import { addSavedColor, removeSavedColor } from "@/lib/settings/saved-colors";

// The user's settings (notes design D9), loaded with the workspace and kept
// here so the settings page, open notes, and color pickers update instantly.
// Editor style changes are saved after a short pause; saved colors at once.

const SAVE_DELAY_MS = 500;

/**
 * Describes a change for its Undo message (theme-specific-editor-colors D5):
 * one message per element property ("all" for a Reset), which remembers the
 * value from before the first change while it's shown.
 */
export type StyleChange = { element: StyleElement; prop: "size" | "light" | "dark" | "all"; label: string };

type Settings = {
  editorStyles: EditorStyles;
  /** CSS custom properties for the editor root. */
  editorVars: React.CSSProperties;
  /** Saves new styles; with `change`, shows a message with Undo. */
  setEditorStyles: (next: EditorStyles, change?: StyleChange) => void;
  savedColors: string[];
  addSavedColor: (hex: string) => void;
  removeSavedColor: (hex: string) => void;
};

const SettingsContext = createContext<Settings | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export function SettingsProvider({ initial, children }: { initial: UserSettings; children: React.ReactNode }) {
  const [editorStyles, setStyles] = useState(initial.editorStyles);
  const [savedColors, setColors] = useState(initial.savedColors);
  const pending = useRef<EditorStyles | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial.editorStyles);
  // Value before the first change of each message still showing, by message key.
  const undoFrom = useRef(new Map<string, ElementStyle | number | string | undefined>());

  const flush = useCallback(async () => {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    const result = await saveEditorStyles(next);
    if (!result.ok) toast.error(result.error);
  }, []);

  const save = useCallback(
    (next: EditorStyles) => {
      latest.current = next;
      setStyles(next);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const setEditorStyles = useCallback(
    (next: EditorStyles, change?: StyleChange) => {
      if (!change) {
        // A change without a message (Reset all) ends any pending Undo.
        for (const key of undoFrom.current.keys()) toast.dismiss(key);
        undoFrom.current.clear();
        save(next);
        return;
      }
      const { element, prop, label } = change;
      const key = `style:${element}:${prop}`;
      const before = latest.current[element];
      if (!undoFrom.current.has(key)) undoFrom.current.set(key, prop === "all" ? before : before?.[prop]);
      save(next);
      const end = () => undoFrom.current.delete(key);
      toast(label, {
        id: key,
        onAutoClose: end,
        onDismiss: end,
        action: {
          label: "Undo",
          onClick: () => {
            const previous = undoFrom.current.get(key);
            end();
            const current = latest.current;
            if (prop === "all") {
              const restored = { ...current };
              if (previous) restored[element] = previous as ElementStyle;
              else delete restored[element];
              save(restored);
            } else {
              save(withElementStyle(current, element, { [prop]: previous }));
            }
          },
        },
      });
    },
    [save],
  );

  // Don't drop a pending change when leaving the page.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush],
  );

  const persistColors = useCallback((next: string[]) => {
    setColors(next);
    void saveSavedColors(next).then((result) => {
      if (!result.ok) toast.error(result.error);
    });
  }, []);

  const value = useMemo<Settings>(
    () => ({
      editorStyles,
      editorVars: editorStyleVariables(editorStyles) as React.CSSProperties,
      setEditorStyles,
      savedColors,
      addSavedColor: (hex) => persistColors(addSavedColor(savedColors, hex)),
      removeSavedColor: (hex) => persistColors(removeSavedColor(savedColors, hex)),
    }),
    [editorStyles, setEditorStyles, savedColors, persistColors],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
