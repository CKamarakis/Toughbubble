"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveEditorStyles, saveSavedColors } from "@/lib/settings/actions";
import { editorStyleVariables, type EditorStyles } from "@/lib/settings/editor-styles";
import type { UserSettings } from "@/lib/settings/operations";
import { addSavedColor, removeSavedColor } from "@/lib/settings/saved-colors";

// The user's settings (notes design D9), loaded with the workspace and kept
// here so the settings page, open notes, and color pickers update instantly.
// Editor style changes are saved after a short pause; saved colors at once.

const SAVE_DELAY_MS = 500;

type Settings = {
  editorStyles: EditorStyles;
  /** CSS custom properties for the editor root. */
  editorVars: React.CSSProperties;
  setEditorStyles: (next: EditorStyles) => void;
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

  const flush = useCallback(async () => {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    const result = await saveEditorStyles(next);
    if (!result.ok) toast.error(result.error);
  }, []);

  const setEditorStyles = useCallback(
    (next: EditorStyles) => {
      setStyles(next);
      pending.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
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
