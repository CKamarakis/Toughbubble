"use client";

import { useCallback, useSyncExternalStore } from "react";

// A string value kept in localStorage and shared by every component that reads
// the same key. The server render and hydration use `fallback`; the stored
// value takes over right after, without a mismatch.

const EVENT = "tb:stored-value";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (private mode, disabled cookies)
  }
}

type Update = string | ((current: string) => string);

export function useStoredValue(key: string, fallback: string): [string, (value: Update) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const set = useCallback(
    (update: Update) => {
      // A function update reads the latest stored value, so callbacks that
      // run later (e.g. after a server action) never write back stale state.
      const next = typeof update === "function" ? update(read(key) ?? fallback) : update;
      try {
        localStorage.setItem(key, next);
      } catch {
        // Not persisted; the change is lost on reload, which is acceptable.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key, fallback],
  );
  return [value, set];
}
