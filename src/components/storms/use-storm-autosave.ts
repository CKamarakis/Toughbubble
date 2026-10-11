"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  autosaveReducer,
  canStartSave,
  hasUnsavedChanges,
  initialAutosave,
  retryDelay,
  SAVE_DELAY_MS,
  statusLabel,
  type AutosaveEvent,
  type AutosaveState,
} from "@/lib/autosave";
import { loadStorm, saveStorm, stormVersion, type SaveStormActionResult } from "@/lib/storms/actions";
import { applyChanges, isEmptyChanges, NO_CHANGES } from "@/lib/storms/changeset";
import { MAX_CHANGESET_BYTES } from "@/lib/storms/limits";
import type { Items } from "@/lib/storms/model";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { StormStore } from "./engine/store";
import { shouldPersist } from "./undo-store";
import { ack, EMPTY_OUTBOX, isQuietOutbox, queue, restore, takeNext, type Outbox } from "./pending";

const TOO_LARGE_MESSAGE = "This storm is too big to save. Remove some items.";
const LOAD_FAILED_MESSAGE = "Couldn't load the latest version. Try again.";
const GONE_MESSAGE = "This storm is no longer available.";

/**
 * Saves a Storm's board automatically (storms-canvas D3), like `useNoteAutosave`:
 * every change set the store emits is queued, and about a second after the last
 * one the queue is sent as one or more saves of at most 800 KB, based on the last
 * saved version. Failures retry with backoff; a conflict pauses saving until the
 * user picks Load latest or Keep mine.
 */
export function useStormAutosave(
  store: StormStore | null,
  itemId: string,
  initialVersion: number,
  options: { onQuietSave?: (version: number) => void } = {},
) {
  const ws = useWorkspace();
  const [state, setState] = useState(() => initialAutosave(initialVersion));
  const [everSaved, setEverSaved] = useState(initialVersion > 0);
  // The machine's state, current between renders (the timers and the save read it).
  const stateRef = useRef<AutosaveState>(state);
  const outbox = useRef<Outbox>(EMPTY_OUTBOX);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef(store);
  // Through a ref so `save` (and the leave flush built on it) stays stable across renders.
  const touchRef = useRef(ws.touch);
  const onQuietSaveRef = useRef(options.onQuietSave);
  /** Keep mine: once its save lands, show the stored board, which has the other tab's items. */
  const reloadAfterSave = useRef(false);
  const alive = useRef(true);
  /** Load latest or Keep mine is being handled: both choices wait for it. */
  const [resolving, setResolving] = useState(false);
  const resolvingRef = useRef(false);

  const send = useCallback((e: AutosaveEvent) => {
    stateRef.current = autosaveReducer(stateRef.current, e);
    setState(stateRef.current);
  }, []);

  const markResolving = useCallback((on: boolean) => {
    resolvingRef.current = on;
    setResolving(on);
  }, []);

  useEffect(() => {
    storeRef.current = store;
    touchRef.current = ws.touch;
    onQuietSaveRef.current = options.onQuietSave;
  }, [store, ws.touch, options.onQuietSave]);

  /** Shows the stored board with the changes not yet saved (or still in flight) on top. */
  const showStored = useCallback((items: Items) => {
    const { inFlight, pending } = outbox.current;
    const mine = applyChanges(applyChanges(items, inFlight ?? NO_CHANGES), pending);
    storeRef.current?.replaceBoard({ schema: 1, items: mine });
  }, []);

  /** One save of the next chunk; true when it was saved. */
  const saveOnce = useCallback(async (): Promise<boolean> => {
    const s = stateRef.current;
    if (!canStartSave(s)) return false;
    const next = takeNext(outbox.current, MAX_CHANGESET_BYTES);
    send({ type: "save-start" });
    if (!next) {
      // Nothing left to send (the edits cancelled out): the stored board is current.
      send({ type: "save-ok", version: s.version });
      return false;
    }
    outbox.current = next.outbox;
    // A split leaves chunks pending: they are unsaved edits for the machine too.
    if (!isEmptyChanges(outbox.current.pending)) send({ type: "edit" });

    let result: SaveStormActionResult;
    try {
      result = await saveStorm(itemId, next.send, s.version);
    } catch {
      result = { status: "error", error: "Couldn't save. Retrying…" };
    }

    if (result.status === "saved") {
      outbox.current = ack(outbox.current);
      send({ type: "save-ok", version: result.version });
      setEverSaved(true);
      const persist = shouldPersist(isQuietOutbox(outbox.current), result);
      touchRef.current(itemId, result.editedAt);
      if (reloadAfterSave.current) {
        reloadAfterSave.current = false;
        const latest = await loadStorm(itemId).catch(() => null);
        if (latest && alive.current) {
          showStored(latest.body.items);
          // Only now, with the history cleared: the pre-merge one must not be kept at this version.
          if (persist && isQuietOutbox(outbox.current)) onQuietSaveRef.current?.(result.version);
        }
        markResolving(false);
      } else if (persist) {
        onQuietSaveRef.current?.(result.version);
      }
      return true;
    }
    outbox.current = restore(outbox.current);
    if (result.status === "conflict") {
      // A Keep mine save that conflicts again offers the choice again.
      markResolving(false);
      send({ type: "save-conflict", storedVersion: result.storedVersion });
    } else if (result.status === "too-large") {
      send({ type: "save-too-large" });
      toast.error(TOO_LARGE_MESSAGE);
    } else if (result.status === "not-found") {
      send({ type: "save-error", error: GONE_MESSAGE });
    } else {
      send({ type: "save-error", error: result.error });
    }
    return false;
  }, [itemId, send, showStored, markResolving]);

  const save = useCallback(async () => {
    // After leaving the page no effect schedules the next chunk, so keep sending here.
    while ((await saveOnce()) && !alive.current);
  }, [saveOnce]);

  // Every change restarts the pause timer.
  useEffect(() => {
    if (!store) return;
    return store.onChange((cs) => {
      outbox.current = queue(outbox.current, cs);
      send({ type: "edit" });
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        debounce.current = null;
        void save();
      }, SAVE_DELAY_MS);
    });
  }, [store, send, save]);

  // More to send after a save (edits made meanwhile, the rest of a split, Keep
  // mine) goes right away unless the user is still editing, in which case the
  // pause timer saves; errors retry after a growing pause.
  useEffect(() => {
    if (state.phase === "dirty" && !debounce.current) {
      const t = setTimeout(() => void save(), 0);
      return () => clearTimeout(t);
    }
    if (state.phase === "error") {
      const t = setTimeout(() => void save(), retryDelay(state.retries));
      return () => clearTimeout(t);
    }
  }, [state.phase, state.retries, save]);

  // Leaving: send what's pending now rather than after the pause (best effort).
  const flush = useCallback(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
    void save();
  }, [save]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      flush();
    };
  }, [flush]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flush]);

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

  // Returning to the tab: quietly show a newer stored board if nothing is unsaved.
  useEffect(() => {
    if (!store) return;
    const quiet = () => {
      const s = stateRef.current;
      return s.phase === "idle" && !s.dirty && isQuietOutbox(outbox.current);
    };
    const check = async () => {
      if (document.visibilityState !== "visible" || !quiet()) return;
      const stored = await stormVersion(itemId).catch(() => null);
      if (stored === null || stored <= stateRef.current.version) return;
      const latest = await loadStorm(itemId).catch(() => null);
      if (!latest || !quiet() || latest.version <= stateRef.current.version) return;
      store.replaceBoard(latest.body);
      send({ type: "refreshed", version: latest.version });
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [store, itemId, send]);

  // Load latest: on failure the conflict bar stays so the user can try again.
  const loadLatest = useCallback(async () => {
    if (resolvingRef.current) return;
    markResolving(true);
    try {
      let latest: Awaited<ReturnType<typeof loadStorm>>;
      try {
        latest = await loadStorm(itemId);
      } catch {
        toast.error(LOAD_FAILED_MESSAGE);
        return;
      }
      if (!latest) {
        toast.error(GONE_MESSAGE);
        return;
      }
      if (!storeRef.current) return;
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = null;
      outbox.current = EMPTY_OUTBOX;
      reloadAfterSave.current = false;
      storeRef.current.replaceBoard(latest.body);
      send({ type: "load-latest", version: latest.version });
    } finally {
      markResolving(false);
    }
  }, [itemId, send, markResolving]);

  // Keep mine: pending until its save is back (and the combined board shown).
  const keepMine = useCallback(() => {
    if (resolvingRef.current || stateRef.current.phase !== "conflict") return;
    markResolving(true);
    reloadAfterSave.current = true;
    send({ type: "keep-mine" });
  }, [send, markResolving]);

  const isQuiet = useCallback(() => isQuietOutbox(outbox.current), []);
  const savedVersion = useCallback(() => stateRef.current.version, []);

  return {
    state,
    status: statusLabel(state, everSaved),
    loadLatest,
    keepMine,
    /** Load latest or Keep mine is in progress: both buttons are disabled. */
    resolving,
    isQuiet,
    /** The version the board was last saved (or loaded) at. */
    savedVersion,
  };
}
