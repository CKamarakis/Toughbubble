"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { loadNote, noteVersion, saveNote } from "@/lib/notes/actions";
import {
  autosaveReducer,
  canStartSave,
  hasUnsavedChanges,
  initialAutosave,
  retryDelay,
  SAVE_DELAY_MS,
  statusLabel,
} from "@/lib/notes/autosave";
import { useWorkspace } from "@/components/workspace/workspace-context";

/**
 * The editor's JSON contains attribute objects that aren't plain objects, which
 * React can't send to a Server Action (they arrive as an opaque reference).
 * Round-tripping through JSON makes the document plain data.
 */
const plainDoc = (doc: JSONContent): JSONContent => JSON.parse(JSON.stringify(doc));

/** Replaces the editor content without an undo step or an "edit" event. */
function replaceContent(editor: Editor, body: JSONContent) {
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta("addToHistory", false);
      return true;
    })
    .setContent(body, { emitUpdate: false })
    .run();
}

/**
 * Saves a note's body automatically (notes design D4): after a pause in typing,
 * when leaving the note, with retries on failure, and with conflict handling
 * when another tab or device saved first.
 */
export function useNoteAutosave(editor: Editor | null, itemId: string, initialVersion: number) {
  const ws = useWorkspace();
  const [state, dispatch] = useReducer(autosaveReducer, initialVersion, initialAutosave);
  const [everSaved, setEverSaved] = useState(initialVersion > 0);
  const stateRef = useRef(state);
  const latestDoc = useRef<JSONContent | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = ws.touch;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const save = useCallback(async () => {
    const s = stateRef.current;
    if (!canStartSave(s) || !latestDoc.current) return;
    const body = latestDoc.current;
    dispatch({ type: "save-start" });
    stateRef.current = { ...s, phase: "saving", dirty: false };
    let result;
    try {
      result = await saveNote(itemId, body, s.version);
    } catch {
      dispatch({ type: "save-error", error: "Couldn't save. Retrying…" });
      return;
    }
    if (result.status === "saved") {
      dispatch({ type: "save-ok", version: result.version });
      setEverSaved(true);
      touch(itemId, result.editedAt);
    } else if (result.status === "conflict") {
      dispatch({ type: "save-conflict", storedVersion: result.storedVersion });
    } else if (result.status === "not-found") {
      dispatch({ type: "save-error", error: "This note is no longer available." });
    } else {
      dispatch({ type: "save-error", error: result.error });
    }
  }, [itemId, touch]);

  // Every edit restarts the pause timer.
  const onEdit = useCallback(() => {
    if (!editor) return;
    latestDoc.current = plainDoc(editor.getJSON());
    dispatch({ type: "edit" });
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      debounce.current = null;
      void save();
    }, SAVE_DELAY_MS);
  }, [editor, save]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", onEdit);
    return () => {
      editor.off("update", onEdit);
    };
  }, [editor, onEdit]);

  // Follow-up save after edits made during a save (unless the user is still
  // typing, in which case the pause timer will save), and retries after errors.
  useEffect(() => {
    if (state.phase === "dirty" && !debounce.current) {
      const t = setTimeout(() => void save(), SAVE_DELAY_MS);
      return () => clearTimeout(t);
    }
    if (state.phase === "error") {
      const t = setTimeout(() => void save(), retryDelay(state.retries));
      return () => clearTimeout(t);
    }
  }, [state.phase, state.retries, save]);

  // Leaving the note (client navigation): send what's pending right away.
  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
      const s = stateRef.current;
      if (s.dirty && s.phase !== "conflict" && latestDoc.current) {
        void saveNote(itemId, latestDoc.current, s.version);
      }
    },
    [itemId],
  );

  // Closing or reloading the tab with unsaved work asks for confirmation.
  const unsaved = hasUnsavedChanges(state);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  // Returning to the tab: quietly take a newer version if nothing is unsaved.
  useEffect(() => {
    if (!editor) return;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const s = stateRef.current;
      if (s.phase !== "idle" || s.dirty) return;
      const stored = await noteVersion(itemId).catch(() => null);
      if (stored === null || stored <= stateRef.current.version) return;
      const latest = await loadNote(itemId).catch(() => null);
      const now = stateRef.current;
      if (!latest || now.phase !== "idle" || now.dirty || editor.isDestroyed) return;
      replaceContent(editor, latest.body);
      dispatch({ type: "refreshed", version: latest.version });
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [editor, itemId]);

  const loadLatest = useCallback(async () => {
    const latest = await loadNote(itemId);
    if (!latest || !editor) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
    replaceContent(editor, latest.body);
    latestDoc.current = null;
    dispatch({ type: "load-latest", version: latest.version });
  }, [editor, itemId]);

  const keepMine = useCallback(() => {
    if (editor) latestDoc.current = plainDoc(editor.getJSON());
    dispatch({ type: "keep-mine" });
  }, [editor]);

  return {
    state,
    status: statusLabel(state, everSaved),
    loadLatest,
    keepMine,
  };
}
