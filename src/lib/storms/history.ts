import type { ChangeSet } from "./changeset";

export type Step = { do: ChangeSet; undo: ChangeSet };
export type History = { undo: Step[]; redo: Step[] };

export const EMPTY_HISTORY: History = { undo: [], redo: [] };
export const MAX_STEPS = 30;

/** Adds a step, dropping the oldest beyond MAX_STEPS. Clears redo. */
export function pushStep(h: History, s: Step): History {
  return { undo: [...h.undo, s].slice(-MAX_STEPS), redo: [] };
}

/** Replaces the last undo step (pushes if none). Clears redo, like a new change. */
export function replaceTop(h: History, s: Step): History {
  return { undo: [...h.undo.slice(0, -1), s].slice(-MAX_STEPS), redo: [] };
}

export function takeUndo(h: History): { history: History; step: Step } | null {
  const step = h.undo[h.undo.length - 1];
  if (!step) return null;
  return { history: { undo: h.undo.slice(0, -1), redo: [...h.redo, step] }, step };
}

export function takeRedo(h: History): { history: History; step: Step } | null {
  const step = h.redo[h.redo.length - 1];
  if (!step) return null;
  return { history: { undo: [...h.undo, step], redo: h.redo.slice(0, -1) }, step };
}
