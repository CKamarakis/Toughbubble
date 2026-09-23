// Autosave state machine (design D4). Pure, so the rules are unit-tested; the
// editor hook owns the timers and calls the save action.
//
//   idle --edit--> dirty --pause/leave--> saving --ok--> idle (or dirty if edited meanwhile)
//   saving --error--> error --retry after backoff--> saving
//   saving --conflict--> conflict (no saving until Load latest / Keep mine)

export type Phase = "idle" | "dirty" | "saving" | "error" | "conflict";

export type AutosaveState = {
  phase: Phase;
  /** Version the next save is based on. */
  version: number;
  /** The editor has changes not yet sent to the server. */
  dirty: boolean;
  /** Failed attempts in a row, for backoff. */
  retries: number;
  /** Version stored on the server, set by a conflict. */
  storedVersion: number | null;
  /** Message from the last failed save. */
  error: string | null;
};

export type AutosaveEvent =
  | { type: "edit" }
  | { type: "save-start" }
  | { type: "save-ok"; version: number }
  | { type: "save-error"; error: string }
  | { type: "save-conflict"; storedVersion: number }
  | { type: "load-latest"; version: number }
  | { type: "keep-mine" }
  | { type: "refreshed"; version: number };

export const SAVE_DELAY_MS = 1000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30_000;

export const initialAutosave = (version: number): AutosaveState => ({
  phase: "idle",
  version,
  dirty: false,
  retries: 0,
  storedVersion: null,
  error: null,
});

/** 2 s, 4 s, 8 s, … up to 30 s between retries. */
export const retryDelay = (retries: number) => Math.min(RETRY_BASE_MS * 2 ** Math.max(retries - 1, 0), RETRY_MAX_MS);

/** Whether a save may start now (something to save, nothing in flight, no conflict). */
export const canStartSave = (s: AutosaveState) => s.dirty && (s.phase === "dirty" || s.phase === "error");

/** Unsaved work exists: warn before the tab closes. */
export const hasUnsavedChanges = (s: AutosaveState) => s.dirty || s.phase === "saving";

export function autosaveReducer(s: AutosaveState, e: AutosaveEvent): AutosaveState {
  switch (e.type) {
    case "edit":
      if (s.phase === "idle") return { ...s, phase: "dirty", dirty: true };
      return { ...s, dirty: true };
    case "save-start":
      return canStartSave(s) ? { ...s, phase: "saving", dirty: false } : s;
    case "save-ok":
      if (s.phase !== "saving") return s;
      // Edits made while saving need one more save on top of the new version.
      return { ...s, phase: s.dirty ? "dirty" : "idle", version: e.version, retries: 0, error: null };
    case "save-error":
      if (s.phase !== "saving") return s;
      return { ...s, phase: "error", dirty: true, retries: s.retries + 1, error: e.error };
    case "save-conflict":
      if (s.phase !== "saving") return s;
      return { ...s, phase: "conflict", dirty: true, storedVersion: e.storedVersion, error: null };
    case "load-latest":
      return { ...initialAutosave(e.version) };
    case "keep-mine":
      if (s.phase !== "conflict" || s.storedVersion === null) return s;
      return { ...s, phase: "dirty", dirty: true, version: s.storedVersion, storedVersion: null, retries: 0 };
    case "refreshed":
      // Only a tab with nothing unsaved takes a newer version quietly.
      return s.phase === "idle" && !s.dirty && e.version > s.version ? { ...s, version: e.version } : s;
  }
}

export type StatusLabel = "" | "Saving…" | "Saved" | "Couldn't save — retrying" | "Changed elsewhere";

export function statusLabel(s: AutosaveState, everSaved: boolean): StatusLabel {
  switch (s.phase) {
    case "dirty":
    case "saving":
      return "Saving…";
    case "error":
      return "Couldn't save — retrying";
    case "conflict":
      return "Changed elsewhere";
    case "idle":
      return everSaved ? "Saved" : "";
  }
}
